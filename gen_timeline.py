import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
import numpy as np

fig, ax = plt.subplots(1, 1, figsize=(12, 5))
fig.patch.set_facecolor('#FFFFFF')
ax.set_facecolor('#FFFFFF')

# Timeline bar
ax.axhline(y=2, xmin=0.05, xmax=0.95, color='#1B2A4A', linewidth=3, solid_capstyle='round')

# Milestones
milestones = [
    (1, "LAUNCH\n(Month 1)", "Open 2 bays\nFirst members\nAI profiles active", "#2D6A4F"),
    (3, "VALIDATE\n(Year 1)", "40% utilization\n$44K net profit\nProduct-market fit", "#40916C"),
    (5.5, "GROW\n(Year 2)", "55% utilization\n$134K net profit\nEquity recovered", "#D4A853"),
    (8, "SCALE\n(Year 3)", "Add 2 more bays\nFounder full-time\n$362K combined", "#1B2A4A"),
    (10.5, "FRANCHISE\n(Year 5+)", "Multi-location\n$707K+ income\nBrand value $1.35M", "#2D6A4F"),
]

for x, title, detail, color in milestones:
    # Node on timeline
    ax.plot(x, 2, 'o', markersize=16, color=color, markeredgecolor='white', markeredgewidth=2, zorder=5)
    # Title above
    ax.text(x, 3.0, title, ha='center', va='bottom', fontsize=10, fontweight='bold', color=color, linespacing=1.3)
    # Detail below
    ax.text(x, 0.8, detail, ha='center', va='top', fontsize=8.5, color='#64748B', linespacing=1.4)

# Arrow at end
ax.annotate('', xy=(11.5, 2), xytext=(11, 2),
            arrowprops=dict(arrowstyle='->', color='#1B2A4A', lw=2))

ax.set_xlim(-0.5, 12.5)
ax.set_ylim(-0.5, 4.5)
ax.axis('off')
ax.set_title("Growth Roadmap: Launch to Franchise", fontsize=14, fontweight='bold', color='#1B2A4A', pad=15)

plt.tight_layout()
plt.savefig('/sessions/exciting-sleepy-cerf/mnt/outputs/timeline.png', dpi=200, bbox_inches='tight', facecolor='white')
print("DONE: timeline.png")
