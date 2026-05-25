<template>
  <div class="dancing-baby" aria-hidden="true" title="Analyzing webpage">
    <span class="baby">👶</span>
    <span class="sparkle sparkle-left">✦</span>
    <span class="sparkle sparkle-right">✦</span>
  </div>
</template>

<style scoped lang="scss">
.dancing-baby {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  margin-right: 6px;
  flex-shrink: 0;
}

.baby {
  display: inline-block;
  font-size: 20px;
  transform-origin: center bottom;
  animation: baby-dance 0.8s ease-in-out infinite alternate;
}

.sparkle {
  position: absolute;
  top: 1px;
  font-size: 8px;
  color: #ff9f43;
  opacity: 0.65;
  animation: sparkle-pulse 0.9s ease-in-out infinite alternate;
}

.sparkle-left {
  left: 0;
}

.sparkle-right {
  right: 0;
  animation-delay: 0.25s;
}

@keyframes baby-dance {
  0% {
    transform: translateY(0) rotate(-10deg) scale(0.96);
  }

  100% {
    transform: translateY(-2px) rotate(10deg) scale(1.04);
  }
}

@keyframes sparkle-pulse {
  0% {
    transform: translateY(1px) scale(0.85);
    opacity: 0.35;
  }

  100% {
    transform: translateY(-1px) scale(1.1);
    opacity: 0.85;
  }
}
</style>