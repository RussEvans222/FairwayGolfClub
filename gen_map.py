import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
import numpy as np

# Approximate lat/lon for locations (relative to Lorton center)
# Lorton: 38.7045, -77.2280
lorton = (0, 0)

# Competitors (all NORTH of Lorton)
competitors = {
    "CAFDExGO Golf": (0.08, 0.12),
    "GolfPark": (0.06, 0.14),
    "Uni Indoor Golf": (-0.02, 0.16),
    "GOLFTEC Fairfax": (0.05, 0.15),
    "GOLFTEC Alexandria": (-0.05, 0.14),
    "Five Iron Golf": (-0.06, 0.22),
    "ParCiti Golf": (-0.08, 0.18),
    "Swing365 Golf DC": (-0.04, 0.24),
}

# Golf courses (near Lorton - demand indicators)
courses = {
    "Laurel Hill GC": (0.01, 0.01),
    "Pohick Bay GC": (-0.04, -0.02),
    "Old Hickory GC": (0.06, -0.04),
    "Lake Ridge GC": (-0.02, -0.08),
    "Burke Lake GC": (0.06, 0.07),
}

# Fort Belvoir
belvoir = (0.04, -0.03)

# Communities
communities = {
    "Lorton": (0, 0.01),
    "Fairfax Station": (0.05, 0.06),
    "Woodbridge": (-0.04, -0.12),
    "Dale City": (-0.08, -0.08),
    "Springfield": (0.06, 0.11),
    "Fort Belvoir": (0.04, -0.03),
}

fig, ax = plt.subplots(1, 1, figsize=(10, 10))
fig.patch.set_facecolor('#F8FAFC')
ax.set_facecolor('#F0F4F8')

# Draw radius rings (approximate: 0.145 deg ≈ 10 miles at this latitude)
for radius, label, alpha in [(0.145, "10 mi", 0.15), (0.217, "15 mi", 0.08)]:
    circle = plt.Circle(lorton, radius, fill=True, facecolor='#2D6A4F', alpha=alpha, edgecolor='#2D6A4F', linewidth=1.5, linestyle='--')
    ax.add_patch(circle)
    ax.annotate(label, xy=(lorton[0] + radius * 0.7, lorton[1] + radius * 0.7),
                fontsize=9, color='#2D6A4F', fontweight='bold', alpha=0.7)

# Draw "gap zone" shading (southern semicircle)
theta = np.linspace(np.pi, 2*np.pi, 100)
r = 0.145
x_gap = lorton[0] + r * np.cos(theta)
y_gap = lorton[1] + r * np.sin(theta)
x_gap = np.append(x_gap, lorton[0])
y_gap = np.append(y_gap, lorton[1])
ax.fill(x_gap, y_gap, color='#D4A853', alpha=0.12)
ax.annotate("ZERO\nCOMPETITION\nZONE", xy=(0, -0.08), fontsize=11, fontweight='bold',
            color='#D4A853', ha='center', va='center', alpha=0.9,
            bbox=dict(boxstyle='round,pad=0.3', facecolor='white', edgecolor='#D4A853', alpha=0.8))

# Plot Fairway Golf Club (center star)
ax.plot(*lorton, marker='*', markersize=22, color='#2D6A4F', zorder=10)
ax.annotate("FAIRWAY\nGOLF CLUB", xy=(lorton[0] + 0.012, lorton[1] + 0.015),
            fontsize=10, fontweight='bold', color='#2D6A4F',
            bbox=dict(boxstyle='round,pad=0.2', facecolor='white', edgecolor='#2D6A4F', alpha=0.9))

# Plot competitors (red)
for name, pos in competitors.items():
    ax.plot(*pos, marker='o', markersize=10, color='#DC2626', zorder=8, markeredgecolor='white', markeredgewidth=1)
    ax.annotate(name, xy=(pos[0] + 0.008, pos[1] + 0.005), fontsize=7, color='#991B1B', alpha=0.9)

# Plot golf courses (blue triangles)
for name, pos in courses.items():
    ax.plot(*pos, marker='^', markersize=9, color='#1D4ED8', zorder=7, markeredgecolor='white', markeredgewidth=0.8)
    ax.annotate(name, xy=(pos[0] + 0.008, pos[1] - 0.008), fontsize=7, color='#1E40AF', alpha=0.85)

# Plot Fort Belvoir (special marker)
ax.plot(*belvoir, marker='s', markersize=12, color='#1B2A4A', zorder=9, markeredgecolor='#D4A853', markeredgewidth=2)
ax.annotate("Fort Belvoir\n51,000+ daily", xy=(belvoir[0] + 0.015, belvoir[1] - 0.01),
            fontsize=8, fontweight='bold', color='#1B2A4A',
            bbox=dict(boxstyle='round,pad=0.2', facecolor='#FEF3C7', edgecolor='#D4A853', alpha=0.9))

# Legend
legend_elements = [
    plt.Line2D([0], [0], marker='*', color='w', markerfacecolor='#2D6A4F', markersize=15, label='Fairway Golf Club'),
    plt.Line2D([0], [0], marker='o', color='w', markerfacecolor='#DC2626', markersize=10, label='Indoor Golf Competitors'),
    plt.Line2D([0], [0], marker='^', color='w', markerfacecolor='#1D4ED8', markersize=10, label='Golf Courses (Demand)'),
    plt.Line2D([0], [0], marker='s', color='w', markerfacecolor='#1B2A4A', markersize=10, label='Fort Belvoir'),
    mpatches.Patch(facecolor='#D4A853', alpha=0.3, label='Zero Competition Zone'),
]
ax.legend(handles=legend_elements, loc='upper left', fontsize=9, framealpha=0.95,
          edgecolor='#E2E8F0', fancybox=True)

# Formatting
ax.set_xlim(-0.25, 0.25)
ax.set_ylim(-0.25, 0.30)
ax.set_aspect('equal')
ax.set_title("Trade Area Map: Competitor Gap South of Springfield", fontsize=14, fontweight='bold', color='#1B2A4A', pad=15)
ax.set_xlabel("← West                                        East →", fontsize=9, color='#64748B')
ax.set_ylabel("← South                                        North →", fontsize=9, color='#64748B')
ax.tick_params(axis='both', which='both', bottom=False, left=False, labelbottom=False, labelleft=False)
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.spines['bottom'].set_color('#E2E8F0')
ax.spines['left'].set_color('#E2E8F0')

plt.tight_layout()
plt.savefig('/sessions/exciting-sleepy-cerf/mnt/outputs/trade_area_map.png', dpi=200, bbox_inches='tight', facecolor='#F8FAFC')
print("DONE: trade_area_map.png")
