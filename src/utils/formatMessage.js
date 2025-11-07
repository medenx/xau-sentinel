function formatPlanToMessage(planData, price) {
  try {
    const h1 = planData.H1 || {};
    return `
*XAU/USD Auto Alert*
Price: ${price}

*Bias H1:* ${h1.bias}
*BOS:* ${h1.lastBOS}
*Latest Close:* ${h1.latestClose}

*Level (H1):*
- Low: ${h1.levels?.low}
- High: ${h1.levels?.high}
- Discount Zone: ${h1.discountZone?.from} - ${h1.discountZone?.to}
- Premium Zone: ${h1.premiumZone?.from} - ${h1.premiumZone?.to}

*Rekomendasi:* ${planData.summary?.recommendation || "-"}

⚠ *Peringatan:* 
${(planData.summary?.warnings || []).join("\n")}
`;
  } catch (err) {
    return `⚠ Error format pesan: ${err.message}`;
  }
}

module.exports = { formatPlanToMessage };
