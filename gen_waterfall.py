import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

fig, ax = plt.subplots(1, 1, figsize=(11, 6))
fig.patch.set_facecolor('#FFFFFF')

# Revenue streams Year 1 (at 40% avg utilization)
# 2 bays * $55/hr * 12hrs * 360 days * 40% = $190K bay revenue
categories = ['Bay Rentals', 'Memberships', 'AI Coaching', 'Corp Events', 'Leagues', 'Beverages', 'TOTAL\nREVENUE']
values = [158, 14, 6, 8, 4, 5, 0]  # Individual streams
total = sum(values[:-1])
values[-1] = total

# Running sum for waterfall
running = [0]
for i in range(len(values) - 1):
    running.append(running[-1] + values[i])

colors = ['#2D6A4F', '#40916C', '#D4A853', '#1B2A4A', '#64748B', '#40916C', '#2D6A4F']

for i, (cat, val) in enumerate(zip(categories, values)):
    if i == len(values) - 1:  # Total bar
        ax.bar(i, val, color='#1B2A4A', width=0.6, edgecolor='white', linewidth=1)
        ax.text(i, val + 2, f'${val}K', ha='center', va='bottom', fontsize=11, fontweight='bold', color='#1B2A4A')
    else:
        bottom = running[i]
        ax.bar(i, val, bottom=bottom, color=colors[i], width=0.6, edgecolor='white', linewidth=1, alpha=0.85)
        ax.text(i, bottom + val + 1.5, f'${val}K', ha='center', va='bottom', fontsize=9, fontweight='bold', color=colors[i])
        # Connector line
        if i < len(values) - 2:
            ax.plot([i + 0.3, i + 0.7], [running[i+1], running[i+1]], color='#CBD5E1', linewidth=1, linestyle='-')

# Percentage labels
for i, val in enumerate(values[:-1]):
    pct = val / total * 100
    bottom = running[i]
    ax.text(i, bottom + val/2, f'{pct:.0f}%', ha='center', va='center', fontsize=8, color='white', fontweight='bold')

ax.set_xticks(range(len(categories)))
ax.set_xticklabels(categories, fontsize=10, color='#1B2A4A')
ax.set_ylabel('$ Thousands', fontsize=11, color='#1B2A4A')
ax.set_title('Year 1 Revenue Waterfall — Multiple Streams Reduce Risk', fontsize=13, fontweight='bold', color='#1B2A4A')
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.grid(axis='y', alpha=0.2)
ax.set_ylim(0, 220)

plt.tight_layout()
plt.savefig('/sessions/exciting-sleepy-cerf/mnt/outputs/waterfall.png', dpi=200, bbox_inches='tight', facecolor='white')
print("DONE: waterfall.png")
