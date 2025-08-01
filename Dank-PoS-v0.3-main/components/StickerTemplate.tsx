import React from 'react';

interface StickerTemplateProps {
  strainName: string;
  strainType: string;
  prices: Array<{
    amount: string;
    price: number;
  }>;
}

export const StickerTemplate: React.FC<StickerTemplateProps> = ({
  strainName,
  strainType,
  prices,
}) => {
  // 8x4 cm = ~302x151 pixels at 96 DPI
  return (
    <div 
      className="bg-white text-black p-2"
      style={{ 
        width: '302px', 
        height: '151px',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      <div className="text-xl font-bold mb-2 truncate">{strainName}</div>
      <div className="text-md mb-2">{strainType}</div>
      <div className="grid grid-cols-4 gap-2 text-sm">
        {prices.map(({ amount, price }, index) => (
          <div key={index} className="text-center">
            <div className="font-bold">{amount}</div>
            <div>{price} ฿</div>
          </div>
        ))}
      </div>
    </div>
  );
};
