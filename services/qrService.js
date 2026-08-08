const QRCode = require('qrcode');

const generateProjectQR = async (projectId, projectName) => {
  try {
    const url = `${process.env.CLIENT_URL}/qr/${projectId}`;
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#1e293b',
        light: '#ffffff',
      },
    });
    return qrDataUrl;
  } catch (error) {
    console.error('QR generation error:', error.message);
    return null;
  }
};

module.exports = { generateProjectQR };
