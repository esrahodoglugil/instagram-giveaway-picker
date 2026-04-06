export function errorHandler(err, req, res, next) {
  console.error('❌ Hata:', err.message);
  res.status(500).json({
    error: err.message || 'Sunucu hatası',
  });
}
