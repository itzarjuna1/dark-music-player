import { Crown, Check, Music, Zap, Shield, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

const Premium = () => {
  const features = [
    { icon: Music, text: 'Ad-free music experience' },
    { icon: Headphones, text: 'High quality audio streaming' },
    { icon: Zap, text: 'Unlimited skips' },
    { icon: Shield, text: 'Offline downloads' },
  ];

  const handlePayment = () => {
    // Open UPI payment link
    const upiId = '9529024655@fam';
    const amount = '99'; // Premium price in INR
    const name = 'MUSIFY Premium';
    const note = 'Premium Subscription';
    
    // UPI deep link format
    const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
    
    // Try to open UPI app
    window.location.href = upiLink;
    
    toast.info('Opening UPI payment app...', {
      description: 'After payment, send screenshot to verify your premium status.',
    });
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText('9529024655@fam');
    toast.success('UPI ID copied to clipboard!');
  };

  return (
    <div className="flex-1 overflow-y-auto pb-32 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary via-accent to-secondary mb-6 animate-float">
            <Crown className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">
            MUSIFY Premium
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock the full potential of your music experience with premium features
          </p>
        </div>

        {/* Pricing Card */}
        <Card className="glass border-primary/30 p-8 mb-12 card-rgb-hover">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-5xl font-bold gradient-text">₹99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              
              <ul className="space-y-3 mb-6">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <feature.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-foreground">{feature.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col items-center gap-4 min-w-[200px]">
              <Button 
                onClick={handlePayment}
                className="w-full btn-rgb text-lg py-6"
                size="lg"
              >
                <Crown className="w-5 h-5 mr-2" />
                Get Premium
              </Button>
              
              <p className="text-sm text-muted-foreground text-center">
                Pay via UPI for instant activation
              </p>
            </div>
          </div>
        </Card>

        {/* UPI Payment Info */}
        <Card className="glass p-6 mb-8">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Payment Information
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">UPI ID</p>
                <p className="font-mono text-lg">9529024655@fam</p>
              </div>
              <Button variant="outline" onClick={copyUpiId} className="shrink-0">
                Copy
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>How to pay:</strong>
              </p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Click "Get Premium" to open your UPI app</li>
                <li>Or manually pay to the UPI ID above</li>
                <li>Send payment screenshot to verify</li>
                <li>Your premium will be activated within 24 hours</li>
              </ol>
            </div>
          </div>
        </Card>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="glass p-6 hover-glow smooth-transition">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <Music className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Ad-Free Experience</h3>
            <p className="text-muted-foreground">
              Enjoy uninterrupted music without any advertisements
            </p>
          </Card>

          <Card className="glass p-6 hover-glow smooth-transition">
            <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mb-4">
              <Headphones className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-semibold text-lg mb-2">High Quality Audio</h3>
            <p className="text-muted-foreground">
              Stream music in the highest available quality
            </p>
          </Card>

          <Card className="glass p-6 hover-glow smooth-transition">
            <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Unlimited Skips</h3>
            <p className="text-muted-foreground">
              Skip as many tracks as you want without limits
            </p>
          </Card>

          <Card className="glass p-6 hover-glow smooth-transition">
            <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-destructive" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Priority Support</h3>
            <p className="text-muted-foreground">
              Get faster response times for any issues
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Premium;
