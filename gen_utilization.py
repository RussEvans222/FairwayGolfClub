import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

fig, ax = plt.subplots(1, 1, figsize=(10, 5))
fig.patch.set_facecolor('#FFFFFF')

years = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5']
utilization = [40, 55, 65, 70, 75]
rev_per_bay = [95, 131, 154, 166, 178]  # $K per bay per year
industry_avg = [150, 150, 150, 150, 150]  # Industry avg for premium

# Dual axis
ax2 = ax.twinx()

# Utilization bars
bars = ax.bar(years, utilization, width=0.5, color='#2D6A4F', alpha=0.7, label='Utilization %')
for bar, val in zip(bars, utilization):
    ax.text(bar.get_x() + bar.get_width()/2, val + 1, f'{val}%', ha='center', fontsize=10, fontweight='bold', color='#2D6A4F')

# Revenue per bay line
ax2.plot(years, rev_per_bay, 'o-', color='#D4A853', linewidth=3, markersize=8, label='Rev/Bay ($K)', zorder=5)
for i, (yr, val) in enumerate(zip(years, rev_per_bay)):
    ax2.annotate(f'${val}K', xy=(i, val + 5), fontsize=9, color='#D4A853', ha='center', fontweight='bold')

# Industry benchmark
ax2.axhline(y=150, color='#DC2626', linewidth=2, linestyle='--', alpha=0.6, label='Industry Avg ($150K/bay)')
ax2.annotate('Industry Avg\n$150K/bay', xy=(0.2, 155), fontsize=8, color='#DC2626', fontstyle='italic')

ax.set_ylabel('Utilization %', fontsize=11, color='#2D6A4F')
ax2.set_ylabel('Revenue per Bay ($K/year)', fontsize=11, color='#D4A853')
ax.set_ylim(0, 100)
ax2.set_ylim(0, 220)
ax.set_title('Utilization Ramp & Revenue per Bay vs. Industry Benchmark', fontsize=13, fontweight='bold', color='#1B2A4A')

# Combined legend
lines1, labels1 = ax.get_legend_handles_labels()
lines2, labels2 = ax2.get_legend_handles_labels()
ax.legend(lines1 + lines2, labels1 + labels2, loc='upper left', fontsize=9)

ax.spines['top'].set_visible(False)
ax2.spines['top'].set_visible(False)

plt.tight_layout()
plt.savefig('/sessions/exciting-sleepy-cerf/mnt/outputs/utilization.png', dpi=200, bbox_inches='tight', facecolor='white')
print("DONE: utilization.png")
