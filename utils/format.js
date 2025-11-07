function safeFixed(value, decimals = 2) {
  if (value === undefined || value === null || isNaN(value)) return "N/A";
  return Number(value).toFixed(decimals);
}
module.exports = { safeFixed };
