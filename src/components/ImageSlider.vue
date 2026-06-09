<template>
  <div v-if="forecastSize > 0" class="image-slider-container">
    <div class="slider-wrapper">
      <div 
        class="slider-track" 
        @click="onSliderClick" 
        ref="sliderTrack"
      >
        <div 
          v-if="!isPanelLoading"
          class="slider-thumb" 
          :style="{ left: getSliderPosition() + '%' }"
          @mousedown="onThumbMouseDown"
          @touchstart="onThumbTouchStart"
        >
          <span class="thumb-label">{{ isDragging ? tempShift : selectedShift }}</span>
        </div>
      </div>
      <div class="slider-info">
        <span>0</span>
        <span>{{ forecastSize - 1 }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ImageSlider',
  props: {
    forecastSize: {
      type: Number,
      required: true,
      default: 24
    },
    selectedShift: {
      type: Number,
      required: true,
      default: 0
    },
    isPanelLoading: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:selectedShift'],
  data() {
    return {
      isDragging: false,
      tempShift: 0,
      windowWidth: window.innerWidth
    }
  },
  mounted() {
    window.addEventListener('resize', this.handleResize);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize);
  },
  methods: {
    handleResize() {
      this.windowWidth = window.innerWidth;
    },
    
    // Получает ширину ползунка в зависимости от размера экрана
    getThumbWidth() {
      return this.windowWidth <= 768 ? 64 : 60;
    },

    // Вычисляет границы позиции ползунка с учетом его ширины
    getSliderBounds(track) {
      const rect = track.getBoundingClientRect();
      const styles = window.getComputedStyle(track);
      const paddingLeft = parseFloat(styles.paddingLeft);
      const paddingRight = parseFloat(styles.paddingRight);
      const thumbWidth = this.getThumbWidth();
      
      // Доступная ширина трека (без padding)
      const availableWidth = rect.width - paddingLeft - paddingRight;
      
      // Минимальная позиция центра ползунка (в пикселях от левого края трека)
      const minPositionPx = paddingLeft + thumbWidth / 2;
      // Максимальная позиция центра ползунка (в пикселях от левого края трека)
      const maxPositionPx = rect.width - paddingRight - thumbWidth / 2;
      
      // Диапазон позиций в пикселях
      const positionRangePx = maxPositionPx - minPositionPx;
      
      return {
        minPositionPx,
        maxPositionPx,
        positionRangePx,
        availableWidth,
        paddingLeft,
        paddingRight,
        rect
      };
    },

    // Преобразует позицию мыши/тача в значение shift с учетом границ
    calculateShiftFromPosition(clientX, track) {
      const bounds = this.getSliderBounds(track);
      
      // Позиция мыши относительно левого края трека
      const mousePosition = clientX - bounds.rect.left;
      
      // Ограничиваем позицию границами
      const clampedPosition = Math.max(bounds.minPositionPx, Math.min(bounds.maxPositionPx, mousePosition));
      
      // Преобразуем позицию в процент от диапазона (0-100%)
      const positionPercent = ((clampedPosition - bounds.minPositionPx) / bounds.positionRangePx) * 100;
      
      // Преобразуем процент в shift
      const newShift = Math.round((positionPercent / 100) * (this.forecastSize - 1));
      return Math.max(0, Math.min(this.forecastSize - 1, newShift));
    },

    // Преобразует shift в процент позиции с учетом границ
    getSliderPosition() {
      if (this.forecastSize <= 1) return 0;
      
      const track = this.$refs.sliderTrack;
      if (!track) return 0;
      
      // Используем tempShift во время перетаскивания, иначе selectedShift
      const shift = this.isDragging ? this.tempShift : this.selectedShift;
      
      const bounds = this.getSliderBounds(track);
      
      // Преобразуем shift в процент (0-100%)
      const shiftPercent = (shift / (this.forecastSize - 1)) * 100;
      
      // Преобразуем процент в позицию в пикселях
      const positionPx = bounds.minPositionPx + (shiftPercent / 100) * bounds.positionRangePx;
      
      // Преобразуем позицию в пикселях в процент от ширины трека (для CSS left)
      const positionPercent = (positionPx / bounds.rect.width) * 100;
      
      return Math.max(0, Math.min(100, positionPercent));
    },

    onSliderClick(event) {
      if (this.forecastSize <= 1 || this.isPanelLoading) return;
      const track = this.$refs.sliderTrack;
      if (!track) return;
      
      const newShift = this.calculateShiftFromPosition(event.clientX, track);
      this.$emit('update:selectedShift', newShift);
    },

    onThumbMouseDown(event) {
      if (this.forecastSize <= 1 || this.isPanelLoading) return;
      event.preventDefault();
      this.isDragging = true;
      this.tempShift = this.selectedShift;

      const track = this.$refs.sliderTrack;
      if (!track) return;

      const handleMouseMove = (e) => {
        if (!this.isDragging) return;
        const newShift = this.calculateShiftFromPosition(e.clientX, track);
        this.tempShift = newShift;
      };

      const handleMouseUp = () => {
        if (this.isDragging) {
          this.$emit('update:selectedShift', this.tempShift);
        }
        this.isDragging = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },

    onThumbTouchStart(event) {
      if (this.forecastSize <= 1 || this.isPanelLoading) return;
      event.preventDefault();
      this.isDragging = true;
      this.tempShift = this.selectedShift;

      const track = this.$refs.sliderTrack;
      if (!track) return;

      const handleTouchMove = (e) => {
        if (!this.isDragging) return;
        const touch = e.touches[0];
        const newShift = this.calculateShiftFromPosition(touch.clientX, track);
        this.tempShift = newShift;
      };

      const handleTouchEnd = () => {
        if (this.isDragging) {
          this.$emit('update:selectedShift', this.tempShift);
        }
        this.isDragging = false;
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };

      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    }
  }
}
</script>

<style scoped>
.image-slider-container {
  width: 100%;
  max-width: 600px;
  margin: 20px auto 0 auto;
  padding: 0;
  box-sizing: border-box;
}

.slider-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.slider-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-color);
  text-align: center;
  margin: 0;
}

.slider-track {
  position: relative;
  width: 100%;
  height: 40px;
  background-color: #eeeeee;
  border: 1px solid #dadada;
  border-radius: 8px;
  cursor: pointer;
  box-sizing: border-box;
  user-select: none;
  touch-action: none;
  display: flex;
  align-items: center;
  padding: 0 5px;
}

.slider-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 32px;
  background-color: var(--primary-color);
  border-radius: 6px;
  cursor: grab;
  transition: 0.05s;
  box-sizing: border-box;
  user-select: none;
  touch-action: none;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
}

.slider-thumb:hover {
  transform: translate(-50%, -50%) scale(1.05);
  background-color: #2491ff;
}

.slider-thumb:active {
  background-color: var(--primary-color);
}


.thumb-label {
  color: white;
  font-size: var(--font-size-sm);
  font-weight: 600;
  text-align: center;
  line-height: 1;
  pointer-events: none;
}

.slider-info {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-xs);
  color: #777;
  margin: 0;
  padding: 0 4px;
}

@media (max-width: 768px) {
  .image-slider-container {
    max-width: 100%;
    margin: 16px auto 0 auto;
  }

  .slider-track {
    height: 44px;
    padding: 0 5px;
  }

  .slider-thumb {
    width: 64px;
    height: 36px;
    min-width: 64px;
  }

  .thumb-label {
    font-size: var(--font-size-sm);
  }
}
</style>
