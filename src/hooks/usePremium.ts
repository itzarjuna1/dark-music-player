import { useState } from 'react';

export const usePremium = () => {
  const [isPremium] = useState(false);
  const [loading] = useState(false);

  const checkPremiumStatus = async () => {};

  return { isPremium, loading, checkPremiumStatus };
};
