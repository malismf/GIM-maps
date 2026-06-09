<template>
  <div class="image-viewer">
    <div class="image-container">
      <div v-if="isImageLoading && !isPanelLoading" class="loading-overlay">
        <div class="spinner"></div>
        <p>Loading GIM map...</p>
      </div>

      <img
        v-if="currentImage"
        :src="currentImage"
        alt="GIM-карта"
        class="gim-image"
        :class="{ 'loading': isImageLoading && !isPanelLoading }"
      />

      <div v-else class="no-image">
        <p>Image not loaded</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ImageViewer',
  props: {
    forecastId: { type: [String, Number], required: true },
    isPanelLoading: { type: Boolean, default: false },
    selectedShift: { type: Number, required: true }
  },
  emits: ['image-error', 'image-loaded'],
  data() {
    return {
      currentImage: null,
      isImageLoading: false,
      imageError: null,
      baseUrl: 'https://services.simurg.space/gim-tec-forecast',
      currentRequestShift: null,
      debounceTimer: null,
      currentImageObject: null
    };
  },
  watch: {
    selectedShift: {
      handler(newShift) {
        this.debouncedLoadImage(newShift);
      },
      immediate: true
    }
  },
  beforeUnmount() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    if (this.currentImageObject) {
      this.currentImageObject.onload = null;
      this.currentImageObject.onerror = null;
      this.currentImageObject.src = '';
    }
  },
  methods: {
    debouncedLoadImage(shift) {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      
      if (this.currentImageObject) {
        this.currentImageObject.onload = null;
        this.currentImageObject.onerror = null;
        this.currentImageObject.src = '';
        this.currentImageObject = null;
      }
      
      if (this.currentImage === null && this.currentRequestShift === null) {
        this.loadImage(shift);
        return;
      }
      
      this.debounceTimer = setTimeout(() => {
        this.loadImage(shift);
        this.debounceTimer = null;
      }, 300);
    },
    
    loadImage(shift) {
      if (!this.forecastId) return;
      
      if (this.currentImageObject) {
        this.currentImageObject.onload = null;
        this.currentImageObject.onerror = null;
        this.currentImageObject.src = '';
        this.currentImageObject = null;
      }
      
      this.currentRequestShift = shift;
      this.isImageLoading = true;
      this.imageError = null;
      
      const imageUrl = `${this.baseUrl}/get_forecast_image/${this.forecastId}?shift=${shift}`;
      const img = new Image();
      this.currentImageObject = img;
      
      img.onload = () => {
        if (this.currentRequestShift === shift && this.currentImageObject === img) {
          this.currentImage = imageUrl;
          this.isImageLoading = false;
          this.$emit('image-loaded');
          this.currentImageObject = null;
        }
      };
      
      img.onerror = () => {
        if (this.currentRequestShift === shift && this.currentImageObject === img) {
          this.imageError = 'Не удалось загрузить изображение.';
          this.isImageLoading = false;
          this.$emit('image-error', this.imageError);
          this.currentImageObject = null;
        }
      };
      
      img.src = `${imageUrl}&t=${Date.now()}`;
    }
  }
};
</script>

<style scoped>
.image-viewer {
  width: 100%;
  display: flex;
  justify-content: center;
  max-width: 100%;
}

.image-container {
  position: relative;
  width: 100%;
  max-width: 600px;
  aspect-ratio: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--background-color, #f0f2f5);
  overflow: hidden;
  animation: fadeIn 0.3s ease-in-out;
}

.gim-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  transition: filter 0.2s ease-out;
  background-color: white;
  will-change: filter;
}

.gim-image.loading {
  filter: blur(4px) brightness(0.8);
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10;
  backdrop-filter: blur(2px);
  border-radius: var(--border-radius, 8px);
  will-change: opacity;
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border-left-color: var(--primary-color, #007bff);
  animation: spin 1s ease infinite;
  margin-bottom: var(--spacing-sm, 12px);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-overlay p {
  font-size: var(--font-size-md, 1rem);
  font-weight: 500;
  color: var(--text-color, #333);
  margin: 0;
  text-align: center;
}

.no-image {
  text-align: center;
  color: #777;
  font-size: var(--font-size-md, 1rem);
  padding: var(--spacing-lg, 20px);
}

/* Адаптивность для планшетов */
@media (max-width: 1024px) {
  .image-container {
    max-width: 500px;
  }

  .loading-overlay p {
    font-size: var(--font-size-sm, 0.875rem);
  }

  .no-image {
    font-size: var(--font-size-sm, 0.875rem);
    padding: var(--spacing-md, 16px);
  }

  .spinner {
    width: 32px;
    height: 32px;
  }
}

/* Адаптивность для мобильных устройств */
@media (max-width: 768px) {
  .image-container {
    max-width: 100%;
    aspect-ratio: 1;
  }

  .loading-overlay p {
    font-size: var(--font-size-sm, 0.875rem);
  }

  .no-image {
    font-size: var(--font-size-sm, 0.875rem);
    padding: var(--spacing-sm, 12px);
  }

  .spinner {
    width: 28px;
    height: 28px;
    margin-bottom: var(--spacing-xs, 8px);
  }
}

/* Адаптивность для очень маленьких экранов */
@media (max-width: 480px) {
  .image-container {
    border-radius: var(--border-radius, 6px);
  }

  .loading-overlay p {
    font-size: var(--font-size-xs, 0.75rem);
  }

  .no-image {
    font-size: var(--font-size-xs, 0.75rem);
    padding: var(--spacing-xs, 8px);
  }

  .spinner {
    width: 24px;
    height: 24px;
    margin-bottom: var(--spacing-xs, 8px);
  }
}

/* Улучшения для touch-устройств */
@media (hover: none) and (pointer: coarse) {
  .image-container {
    border-width: 2px;
  }

  .gim-image {
    cursor: pointer;
  }
}

/* Улучшения для высокого DPI экранов */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .gim-image {
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
  }
}

/* Анимации для плавного появления */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>