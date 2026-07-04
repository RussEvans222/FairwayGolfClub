import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np

fig, ax = plt.subplots(1, 1, figsize=(10, 8))
fig.patch.set_facecolor('#FFFFFF')
ax.set_facecolor('#FFFFFF')

# Quadrant shading
ax.axhspan(5, 10, xmin=0, xmax=0.5, alpha=0.04, color='#64748B')  # Premium+Entertainment
ax.axhspan(5, 10, xmin=0.5, xmax=1.0, alpha=0.12, color='#2D6A4F')  # Premium+Improvement (OUR ZONE)
ax.axhspan(0, 5, xmin=0, xmax=0.5, alpha=0.04, color='#DC2626')  # Basic+Entertainment
ax.axhspan(0, 5, xmin=0.5, xmax=1.0, alpha=0.04, color='#D4A853')  # Basic+Improvement

# Axis lines
ax.axhline(y=5, color='#1B2A4A', linewidth=1.5, alpha=0.4)
ax.axvline(x=5, color='#1B2A4A', linewidth=1.5, alpha=0.4)

# Competitors plotted
competitors = {
    "Five Iron Golf": (2.5, 7.5),
    "ParCiti Golf": (2.0, 6.0),
    "Swing365 DC": (3.0, 4.0),
    "Uni Indoor Golf": (3.5, 2.5),
    "CAFDExGO Golf": (4.0, 3.5),
    "GolfPark": (3.0, 3.0),
    "GOLFTEC Fairfax": (8.5, 6.5),
    "GOLFTEC Alexandria": (8.0, 6.0),
}

for name, (x, y) in competitors.items():
    ax.plot(x, y, 'o', markersize=12, color='#DC2626', markeredgecolor='white', markeredgewidth=1.5, zorder=5)
    offset = (0.2, 0.2)
    if 'GOLFTEC' in name:
        offset = (0.2, -0.3)
    ax.annotate(name, xy=(x + offset[0], y + offset[1]), fontsize=8.5, color='#991B1B', fontweight='medium')

# Fairway Golf Club (THE STAR)
fx, fy = 7.5, 8.5
ax.plot(fx, fy, '*', markersize=28, color='#2D6A4F', zorder=10, markeredgecolor='white', markeredgewidth=1)
ax.annotate("FAIRWAY\nGOLF CLUB", xy=(fx + 0.3, fy - 0.1), fontsize=11, fontweight='bold', color='#2D6A4F',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='white', edgecolor='#2D6A4F', alpha=0.9))

# Quadrant labels
ax.text(2.5, 9.3, "PREMIUM\nENTERTAINMENT", fontsize=10, ha='center', va='center', color='#64748B', fontweight='bold', alpha=0.6)
ax.text(7.5, 9.3, "PREMIUM\nIMPROVEMENT", fontsize=10, ha='center', va='center', color='#2D6A4F', fontweight='bold', alpha=0.8)
ax.text(2.5, 0.7, "BASIC\nENTERTAINMENT", fontsize=10, ha='center', va='center', color='#DC2626', fontweight='bold', alpha=0.5)
ax.text(7.5, 0.7, "BASIC\nIMPROVEMENT", fontsize=10, ha='center', va='center', color='#D4A853', fontweight='bold', alpha=0.6)

# "UNOCCUPIED" callout for our quadrant
ax.annotate("← Open market\n     position", xy=(6.5, 8.0), fontsize=9, color='#2D6A4F', fontstyle='italic', alpha=0.8)

# Axis labels
ax.set_xlabel("ENTERTAINMENT                                                                    IMPROVEMENT →", fontsize=11, fontweight='bold', color='#1B2A4A', labelpad=10)
ax.set_ylabel("BASIC                                                                    PREMIUM →", fontsize=11, fontweight='bold', color='#1B2A4A', labelpad=10)
ax.set_xlim(0, 10)
ax.set_ylim(0, 10)
ax.set_xticks([])
ax.set_yticks([])
ax.spines['top'].set_color('#E2E8F0')
ax.spines['right'].set_color('#E2E8F0')
ax.spines['bottom'].set_color('#1B2A4A')
ax.spines['left'].set_color('#1B2A4A')
ax.spines['bottom'].set_linewidth(2)
ax.spines['left'].set_linewidth(2)

ax.set_title("Competitive Positioning: Fairway Owns the Premium Improvement Space", fontsize=13, fontweight='bold', color='#1B2A4A', pad=15)

plt.tight_layout()
plt.savefig('/sessions/exciting-sleepy-cerf/mnt/outputs/positioning_matrix.png', dpi=200, bbox_inches='tight', facecolor='white')
print("DONE: positioning_matrix.png")
