import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch
import numpy as np

fig, ax = plt.subplots(1, 1, figsize=(10, 10))
fig.patch.set_facecolor('#FFFFFF')
ax.set_facecolor('#FFFFFF')

# Flywheel circle
theta_positions = np.linspace(0, 2*np.pi, 6, endpoint=False) - np.pi/2  # Start from top

labels = [
    "PLAY\nSimulator Session",
    "CAPTURE\nData Cloud Records\nEvery Shot",
    "ANALYZE\nGolfer360 Profile\nUpdates",
    "COACH\nAgentforce AI\nRecommendations",
    "IMPROVE\nTargeted Practice\nPlan",
    "RETURN\nTrack Progress\n& Repeat"
]

colors = ["#2D6A4F", "#40916C", "#1B2A4A", "#D4A853", "#2D6A4F", "#40916C"]
radius = 3.2

# Draw connecting arrows (curved)
for i in range(6):
    angle_start = theta_positions[i]
    angle_end = theta_positions[(i + 1) % 6]
    # Draw arc arrow
    mid_angle = (angle_start + angle_end) / 2
    arc_angles = np.linspace(angle_start + 0.3, angle_end - 0.3, 30)
    arc_x = radius * 0.75 * np.cos(arc_angles)
    arc_y = radius * 0.75 * np.sin(arc_angles)
    ax.plot(arc_x, arc_y, color='#94A3B8', linewidth=2, alpha=0.5)
    # Arrowhead
    dx = arc_x[-1] - arc_x[-2]
    dy = arc_y[-1] - arc_y[-2]
    ax.annotate('', xy=(arc_x[-1], arc_y[-1]),
                xytext=(arc_x[-3], arc_y[-3]),
                arrowprops=dict(arrowstyle='->', color='#64748B', lw=2))

# Draw nodes
for i, (label, color) in enumerate(zip(labels, colors)):
    x = radius * np.cos(theta_positions[i])
    y = radius * np.sin(theta_positions[i])
    
    # Circle node
    circle = plt.Circle((x, y), 0.9, facecolor=color, edgecolor='white', linewidth=3, zorder=5, alpha=0.9)
    ax.add_patch(circle)
    
    # Label inside
    ax.text(x, y, label, ha='center', va='center', fontsize=8.5, fontweight='bold',
            color='white', zorder=6, linespacing=1.3)

# Center text
ax.text(0, 0.3, "THE\nFAIRWAY\nFLYWHEEL", ha='center', va='center', fontsize=16, fontweight='bold',
        color='#1B2A4A', linespacing=1.3)
ax.text(0, -0.8, "Every visit generates data.\nEvery data point improves coaching.\nEvery improvement drives retention.", 
        ha='center', va='center', fontsize=9, color='#64748B', linespacing=1.5, fontstyle='italic')

# Outer ring suggestion
outer_circle = plt.Circle((0, 0), 4.3, fill=False, edgecolor='#E2E8F0', linewidth=2, linestyle='--')
ax.add_patch(outer_circle)

ax.set_xlim(-5, 5)
ax.set_ylim(-5, 5)
ax.set_aspect('equal')
ax.axis('off')
ax.set_title("Technology Flywheel: Self-Reinforcing Improvement Loop", fontsize=14, fontweight='bold', color='#1B2A4A', pad=20)

plt.tight_layout()
plt.savefig('/sessions/exciting-sleepy-cerf/mnt/outputs/flywheel.png', dpi=200, bbox_inches='tight', facecolor='white')
print("DONE: flywheel.png")
