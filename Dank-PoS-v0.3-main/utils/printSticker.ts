import { PricingOption } from '../types';

export const printSticker = (
  name: string,
  type: string,
  pricingOptions: PricingOption[],
  barcodeId?: string
) => {
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  // Extract type from description
  const strainType = type.match(/\[(.*?)\]/)?.[1] || type;

  // Get standard weight options
  const weights = ['50g', '100g', '500g', '1000g'];
  const prices = weights.map(weight => {
    const grams = parseInt(weight);
    const priceOption = pricingOptions.find(op => op.unit === 'grams');
    const pricePerGram = priceOption ? priceOption.price : 0;
    return {
      amount: weight,
      price: Math.round(grams * pricePerGram)
    };
  });

  // Create the sticker HTML
  const stickerHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          @page {
            size: 8cm 4cm;
            margin: 0;
          }
          body {
            width: 8cm;
            height: 4cm;
            margin: 0;
            padding: 0.5cm;
            box-sizing: border-box;
            font-family: Arial, sans-serif;
          }
          .sticker {
            width: 100%;
            height: 100%;
          }
          .strain-name {
            font-size: 16pt;
            font-weight: bold;
            margin-bottom: 0.2cm;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .strain-type {
            font-size: 12pt;
            margin-bottom: 0.2cm;
          }
          .prices {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 0.2cm;
            font-size: 10pt;
          }
          .price-item {
            text-align: center;
          }
          .amount {
            font-weight: bold;
          }
          .barcode {
            margin-top: 0.2cm;
          }
        </style>
      </head>
      <body>
        <div class="sticker">
          <div class="strain-name">${name}</div>
          <div class="strain-type">${strainType}</div>
          <div class="prices">
            ${prices.map(p => `
              <div class="price-item">
                <div class="amount">${p.amount}</div>
                <div>${p.price} ฿</div>
              </div>
            `).join('')}
          </div>
          <svg id="barcode" class="barcode"></svg>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <script>
          window.addEventListener('load', function() {
            if (${barcodeId ? 'true' : 'false'}) {
              JsBarcode('#barcode', '${barcodeId ?? ''}', { format: 'CODE128', width: 2, height: 40 });
            }
          });
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(stickerHTML);
  printWindow.document.close();
  
  // Wait for content to load then print
  printWindow.onload = () => {
    printWindow.print();
    printWindow.onafterprint = () => {
      printWindow.close();
    };
  };
};
