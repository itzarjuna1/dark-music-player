import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const usePremium = () => {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkPremiumStatus();
    } else {
      setIsPremium(false);
      setLoading(false);
    }
  }, [user]);

  const checkPremiumStatus = async () => {
    if (!user) return;

    try {
      // Check if user has premium in their profile metadata
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      // For now, premium status can be stored as a field
      // You can extend the profiles table to include is_premium
      setIsPremium(false); // Default to false until premium system is implemented
    } catch (error) {
      console.error('Error checking premium status:', error);
      setIsPremium(false);
    } finally {
      setLoading(false);
    }
  };

  return { isPremium, loading, checkPremiumStatus };
};
