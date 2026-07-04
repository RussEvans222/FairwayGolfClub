import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

fig, ax = plt.subplots(1, 1, figsize=(11, 6))
fig.patch.set_facecolor('#FFFFFF')

# Year 1 Monthly P&L
# Assumptions: 2 bays, $55/hr, 12 hrs/day, 360 days/yr = $475K max
# 40% utilization ramping: starts at 25% month 1, reaches 45% by month 12
monthly_util = [0.20, 0.25, 0.30, 0.33, 0.36, 0.38, 0.40, 0.42, 0.43, 0.44, 0.45, 0.46]
max_monthly_rev = 2 * 55 * 12 * 30  # $39,600/month at 100%
monthly_revenue = [max_monthly_rev * u for u in monthly_util]
# Add 20% ancillary
monthly_revenue = [r * 1.2 for r in monthly_revenue]

# Monthly opex = $12K + $1.5K debt service = $13.5K
monthly_opex = 13500
months = list(range(1, 13))
monthly_profit = [r - monthly_opex for r in monthly_revenue]
cumulative = np.cumsum(monthly_profit)

# Revenue bars
bars = ax.bar(months, [r/1000 for r in monthly_revenue], width=0.4, color='#2D6A4F', alpha=0.7, label='Revenue ($K)', align='center')

# Opex line
ax.axhline(y=monthly_opex/1000, color='#DC2626', linewidth=2, linestyle='--', label=f'Monthly Opex (${monthly_opex/1000:.1f}K)', alpha=0.8)

# Profit/loss area
for i, (rev, profit) in enumerate(zip(monthly_revenue, monthly_profit)):
    color = '#2D6A4F' if profit >= 0 else '#DC2626'
    if profit >= 0:
        ax.bar(months[i] + 0.4, profit/1000, width=0.35, color=color, alpha=0.3, align='center')

# Mark breakeven month
breakeven_month = None
for i, p in enumerate(monthly_profit):
    if p >= 0 and breakeven_month is None:
        breakeven_month = i + 1

if breakeven_month:
    ax.axvline(x=breakeven_month - 0.1, color='#D4A853', linewidth=2, linestyle='-', alpha=0.8)
    ax.annotate(f'Break-Even\nMonth {breakeven_month}', xy=(breakeven_month, monthly_revenue[breakeven_month-1]/1000 + 0.5),
                fontsize=10, fontweight='bold', color='#D4A853', ha='center',
                bbox=dict(boxstyle='round,pad=0.3', facecolor='#FEF3C7', edgecolor='#D4A853'))

ax.set_xlabel('Month', fontsize=11, color='#1B2A4A')
ax.set_ylabel('$ Thousands', fontsize=11, color='#1B2A4A')
ax.set_title('Year 1 Monthly Revenue vs. Operating Costs — Break-Even Analysis', fontsize=13, fontweight='bold', color='#1B2A4A')
ax.set_xticks(months)
ax.set_xticklabels([f'M{m}' for m in months])
ax.legend(loc='upper left', fontsize=10)
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.grid(axis='y', alpha=0.3)

plt.tight_layout()
plt.savefig('/sessions/exciting-sleepy-cerf/mnt/outputs/breakeven.png', dpi=200, bbox_inches='tight', facecolor='white')
print("DONE: breakeven.png")
