import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const ICE = { iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] };

export type VoicePeer = { userId: string; stream?: MediaStream; speaking?: boolean };

export function useVoiceRoom(roomId: string | null, userId: string | null) {
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [peers, setPeers] = useState<Record<string, VoicePeer>>({});
  const localStream = useRef<MediaStream | null>(null);
  const pcs = useRef<Record<string, RTCPeerConnection>>({});
  const audioEls = useRef<Record<string, HTMLAudioElement>>({});

  const cleanupPeer = (uid: string) => {
    pcs.current[uid]?.close();
    delete pcs.current[uid];
    audioEls.current[uid]?.remove();
    delete audioEls.current[uid];
    setPeers((p) => { const n = { ...p }; delete n[uid]; return n; });
  };

  const sendSignal = async (to: string, kind: string, payload: any) => {
    if (!roomId || !userId) return;
    await (supabase as any).from('voice_signals').insert({
      room_id: roomId, from_user: userId, to_user: to, kind, payload,
    });
  };

  const createPeer = useCallback((remoteId: string, initiator: boolean) => {
    if (!localStream.current || !roomId || !userId) return null;
    const pc = new RTCPeerConnection(ICE);
    pcs.current[remoteId] = pc;
    localStream.current.getTracks().forEach((t) => pc.addTrack(t, localStream.current!));

    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal(remoteId, 'ice', e.candidate.toJSON());
    };
    pc.ontrack = (e) => {
      const [stream] = e.streams;
      let el = audioEls.current[remoteId];
      if (!el) {
        el = document.createElement('audio');
        el.autoplay = true;
        (el as any).playsInline = true;
        document.body.appendChild(el);
        audioEls.current[remoteId] = el;
      }
      el.srcObject = stream;
      setPeers((p) => ({ ...p, [remoteId]: { ...(p[remoteId] || { userId: remoteId }), stream } }));
    };
    pc.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) cleanupPeer(remoteId);
    };

    if (initiator) {
      (async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal(remoteId, 'offer', offer);
      })();
    }
    setPeers((p) => ({ ...p, [remoteId]: p[remoteId] || { userId: remoteId } }));
    return pc;
  }, [roomId, userId]);

  const join = useCallback(async () => {
    if (!roomId || !userId || connected) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStream.current = stream;
    } catch {
      throw new Error('Microphone permission denied');
    }
    // Register presence
    await (supabase as any).from('voice_participants').upsert(
      { room_id: roomId, user_id: userId, is_muted: false, last_seen: new Date().toISOString() },
      { onConflict: 'room_id,user_id' },
    );
    // Get existing participants and offer to each
    const { data: existing } = await (supabase as any)
      .from('voice_participants').select('user_id').eq('room_id', roomId).neq('user_id', userId);
    (existing || []).forEach((row: any) => createPeer(row.user_id, true));
    setConnected(true);
  }, [roomId, userId, connected, createPeer]);

  const leave = useCallback(async () => {
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    Object.keys(pcs.current).forEach(cleanupPeer);
    if (roomId && userId) {
      await (supabase as any).from('voice_participants').delete().eq('room_id', roomId).eq('user_id', userId);
    }
    setConnected(false);
    setPeers({});
  }, [roomId, userId]);

  const toggleMute = useCallback(async () => {
    const next = !muted;
    localStream.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
    if (roomId && userId) {
      await (supabase as any).from('voice_participants').update({ is_muted: next }).eq('room_id', roomId).eq('user_id', userId);
    }
  }, [muted, roomId, userId]);

  // Realtime: incoming signals + new participants
  useEffect(() => {
    if (!connected || !roomId || !userId) return;
    const sigChan = supabase
      .channel(`voice-sig-${roomId}-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'voice_signals',
        filter: `to_user=eq.${userId}`,
      }, async (payload) => {
        const row: any = payload.new;
        if (row.room_id !== roomId) return;
        let pc = pcs.current[row.from_user];
        if (!pc && (row.kind === 'offer' || row.kind === 'ice')) {
          pc = createPeer(row.from_user, false)!;
        }
        if (!pc) return;
        try {
          if (row.kind === 'offer') {
            await pc.setRemoteDescription(row.payload);
            const ans = await pc.createAnswer();
            await pc.setLocalDescription(ans);
            await sendSignal(row.from_user, 'answer', ans);
          } else if (row.kind === 'answer') {
            await pc.setRemoteDescription(row.payload);
          } else if (row.kind === 'ice') {
            await pc.addIceCandidate(row.payload);
          }
        } catch (e) { console.warn('signal error', e); }
        // Clean up processed signal
        await (supabase as any).from('voice_signals').delete().eq('id', row.id);
      })
      .subscribe();

    const partChan = supabase
      .channel(`voice-part-${roomId}`)
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'voice_participants',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        const old: any = payload.old;
        if (old?.user_id) cleanupPeer(old.user_id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sigChan);
      supabase.removeChannel(partChan);
    };
  }, [connected, roomId, userId, createPeer]);

  // Cleanup on unmount / tab close
  useEffect(() => {
    const handler = () => { void leave(); };
    window.addEventListener('beforeunload', handler);
    return () => { window.removeEventListener('beforeunload', handler); void leave(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  return { connected, muted, peers, join, leave, toggleMute };
}
