import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { MessageSquare } from 'lucide-react';

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DepositDialog({ open, onOpenChange }: DepositDialogProps) {
  const [whatsappNumber, setWhatsappNumber] = useState<string>('');
  const [depositMessage, setDepositMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDepositSettings = async () => {
      try {
        const response = await fetch('/api/deposit-settings');
        if (response.ok) {
          const data = await response.json();
          setWhatsappNumber(data.whatsappNumber || '');
          setDepositMessage(data.depositMessage || '');
        }
      } catch (error) {
        console.error('Error fetching deposit settings:', error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchDepositSettings();
    }
  }, [open]);

  const handleWhatsAppClick = () => {
    if (!whatsappNumber) {
      alert('WhatsApp number not configured. Please contact support.');
      return;
    }

    const formattedNumber = whatsappNumber.replace(/[^0-9]/g, '');
    const encodedMessage = encodeURIComponent(depositMessage || 'Hello, I would like to deposit chips.');
    const whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-neo-bg border-2 border-neo-accent">
        <DialogHeader>
          <DialogTitle className="text-neo-accent text-2xl font-heading font-bold flex items-center gap-2">
            <span>💰</span> Deposit / Withdraw
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-neo-accent"></div>
              <p className="text-neo-text-secondary mt-2">Loading...</p>
            </div>
          ) : (
            <>
              <div className="bg-neo-bg-secondary border border-neo-border rounded-lg p-4">
                <p className="text-neo-text text-sm leading-relaxed whitespace-pre-wrap">
                  {depositMessage || 'Contact us via WhatsApp to deposit or withdraw chips.'}
                </p>
              </div>

              <Button
                onClick={handleWhatsAppClick}
                disabled={!whatsappNumber}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-heading font-semibold py-6 text-lg transition-all duration-300 flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-5 h-5" />
                Chat on WhatsApp
              </Button>

              {!whatsappNumber && (
                <p className="text-red-400 text-xs text-center">
                  WhatsApp number not configured. Please contact support.
                </p>
              )}

              <div className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="text-neo-text-secondary hover:text-neo-accent transition-colors"
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
