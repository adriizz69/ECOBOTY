<template>
  <div class="stats-chart">
    <div class="stats-chart-meta">
      <div class="stats-chart-metric">
        <span class="stats-chart-label">Total</span>
        <strong>{{ total }}</strong>
      </div>
      <div class="stats-chart-metric">
        <span class="stats-chart-label">Max</span>
        <strong>{{ maxValue }}</strong>
      </div>
      <div class="stats-chart-metric">
        <span class="stats-chart-label">Points</span>
        <strong>{{ points.length }}</strong>
      </div>
      <div class="stats-chart-metric">
        <span class="stats-chart-label">Moyenne</span>
        <strong>{{ averageValue }}</strong>
      </div>
    </div>

    <div class="stats-chart-canvas" @mouseleave="clearHovered">
      <svg viewBox="0 0 1000 260" role="img" aria-label="Statistiques">
        <g class="stats-chart-grid">
          <line
            v-for="line in gridLines"
            :key="`line-${line}`"
            x1="40"
            :y1="line"
            x2="980"
            :y2="line"
          />
        </g>

        <polyline
          v-if="points.length"
          class="stats-chart-line"
          :style="{ '--line-color': color }"
          :points="linePoints"
        />

        <line
          v-if="hoveredPoint"
          class="stats-chart-cursor"
          :x1="hoveredPoint.x"
          y1="30"
          :x2="hoveredPoint.x"
          y2="230"
        />

        <circle
          v-for="(point, index) in points"
          :key="`point-${index}`"
          class="stats-chart-point"
          :style="{ '--point-color': color }"
          :cx="point.x"
          :cy="point.y"
          r="4"
          tabindex="0"
          @mouseenter="setHovered(index)"
          @mousemove="setHovered(index)"
          @focus="setHovered(index)"
          @blur="clearHovered"
        >
          <title>{{ point.label }}: {{ point.value }}</title>
        </circle>
      </svg>

      <div v-if="hoveredPoint" class="stats-chart-tooltip" :style="tooltipStyle">
        <div class="stats-chart-tooltip-date">{{ hoveredPoint.label }}</div>
        <div class="stats-chart-tooltip-value">
          {{ valueLabel }}: <strong>{{ hoveredPoint.value }}</strong>
        </div>
      </div>
    </div>

    <div class="stats-chart-labels">
      <span>{{ labels[0] || "—" }}</span>
      <span>{{ labels[Math.floor((labels.length - 1) / 2)] || "—" }}</span>
      <span>{{ labels[labels.length - 1] || "—" }}</span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  labels: {
    type: Array,
    default: () => []
  },
  values: {
    type: Array,
    default: () => []
  },
  color: {
    type: String,
    default: "#3b82f6"
  },
  valueLabel: {
    type: String,
    default: "Valeur"
  }
});

const safeValues = computed(() =>
  (props.values || []).map((value) => {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  })
);

const maxValue = computed(() => {
  if (!safeValues.value.length) return 0;
  return Math.max(...safeValues.value, 0);
});

const total = computed(() => safeValues.value.reduce((sum, value) => sum + value, 0));
const averageValue = computed(() => {
  if (!safeValues.value.length) return 0;
  return Math.round(total.value / safeValues.value.length);
});

const points = computed(() => {
  const values = safeValues.value;
  if (!values.length) return [];

  const chartWidth = 940;
  const chartHeight = 200;
  const offsetX = 40;
  const offsetY = 30;
  const stepX = values.length > 1 ? chartWidth / (values.length - 1) : 0;
  const max = Math.max(maxValue.value, 1);

  return values.map((value, index) => {
    const x = offsetX + index * stepX;
    const y = offsetY + chartHeight - (value / max) * chartHeight;
    return {
      index,
      x,
      y,
      value,
      label: props.labels[index] || `Point ${index + 1}`
    };
  });
});

const hoveredIndex = ref(-1);
const hoveredPoint = computed(() => {
  if (hoveredIndex.value < 0 || hoveredIndex.value >= points.value.length) return null;
  return points.value[hoveredIndex.value];
});
const tooltipStyle = computed(() => {
  if (!hoveredPoint.value) return {};
  const leftPct = Math.max(8, Math.min(92, (hoveredPoint.value.x / 1000) * 100));
  const topPct = Math.max(12, Math.min(82, (hoveredPoint.value.y / 260) * 100));
  return {
    left: `${leftPct}%`,
    top: `${topPct}%`
  };
});
const setHovered = (index) => {
  hoveredIndex.value = index;
};
const clearHovered = () => {
  hoveredIndex.value = -1;
};

const linePoints = computed(() => points.value.map((point) => `${point.x},${point.y}`).join(" "));
const gridLines = [30, 80, 130, 180, 230];
</script>

<style scoped>
.stats-chart {
  display: grid;
  gap: 10px;
}

.stats-chart-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.stats-chart-metric {
  display: grid;
  gap: 2px;
  min-width: 90px;
  border: 1px solid color-mix(in oklab, var(--ui-border) 80%, transparent);
  background: color-mix(in oklab, var(--ui-bg-elevated) 70%, transparent);
  border-radius: 8px;
  padding: 8px 10px;
}

.stats-chart-label {
  font-size: 11px;
  opacity: 0.8;
}

.stats-chart-canvas {
  position: relative;
  border: 1px solid color-mix(in oklab, var(--ui-border) 80%, transparent);
  border-radius: 10px;
  background: color-mix(in oklab, var(--ui-bg-elevated) 55%, transparent);
  overflow: hidden;
}

.stats-chart-canvas svg {
  display: block;
  width: 100%;
  height: 260px;
}

.stats-chart-grid line {
  stroke: color-mix(in oklab, var(--ui-border) 65%, transparent);
  stroke-width: 1;
}

.stats-chart-line {
  fill: none;
  stroke: var(--line-color, #3b82f6);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.stats-chart-cursor {
  stroke: color-mix(in oklab, var(--ui-border) 70%, transparent);
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.stats-chart-point {
  fill: var(--point-color, #3b82f6);
  stroke: #0b1220;
  stroke-width: 1.5;
  cursor: pointer;
}

.stats-chart-point:focus-visible {
  outline: none;
  stroke: #fff;
  stroke-width: 2;
}

.stats-chart-tooltip {
  position: absolute;
  transform: translate(-50%, -120%);
  border: 1px solid color-mix(in oklab, var(--ui-border) 85%, transparent);
  background: color-mix(in oklab, var(--ui-bg-elevated) 92%, #000 8%);
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 12px;
  line-height: 1.3;
  pointer-events: none;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
  min-width: 110px;
}

.stats-chart-tooltip-date {
  opacity: 0.82;
}

.stats-chart-tooltip-value {
  margin-top: 2px;
}

.stats-chart-labels {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  opacity: 0.85;
}
</style>
