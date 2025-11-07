function formatPlanToMessage(summary) {
  let msg = `📊 XAUUSD Plan\nPrice: ${summary.price}\n\n`;
  for (const tf of ["H1", "H4", "D1"]) {
    const p = summary.plan[tf];
    msg += `🕐 ${tf} | Bias: ${p.bias} | Close: ${p.latestClose}\n`;
  }
  return msg;
}
module.exports = { formatPlanToMessage };
