<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  images: { type: Array, required: true },
  initialIndex: { type: Number, default: 0 }
})

const emit = defineEmits(['close'])

const currentIndex = ref(props.initialIndex)
const isVisible = ref(false)

const currentImage = computed(() => props.images[currentIndex.value])
const hasMultiple = computed(() => props.images.length > 1)

onMounted(() => {
  requestAnimationFrame(() => {
    isVisible.value = true
  })
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

const handleKeydown = (e) => {
  if (e.key === 'Escape') handleClose()
  if (e.key === 'ArrowLeft') handlePrev()
  if (e.key === 'ArrowRight') handleNext()
}

const handleClose = () => {
  isVisible.value = false
  setTimeout(() => emit('close'), 300)
}

const handlePrev = () => {
  if (!hasMultiple.value) return
  currentIndex.value = (currentIndex.value - 1 + props.images.length) % props.images.length
}

const handleNext = () => {
  if (!hasMultiple.value) return
  currentIndex.value = (currentIndex.value + 1) % props.images.length
}

const handleOverlayClick = (e) => {
  if (e.target === e.currentTarget) handleClose()
}
</script>

<template>
  <Teleport to="body">
    <div 
      class="lightbox-overlay" 
      :class="{ active: isVisible }"
      @click="handleOverlayClick"
    >
      <button class="lightbox-close" @click="handleClose">✕</button>
      
      <button 
        v-if="hasMultiple" 
        class="lightbox-nav lightbox-prev" 
        @click="handlePrev"
      >
        ‹
      </button>
      
      <div class="lightbox-content">
        <img :src="currentImage.url" :alt="currentImage.name" class="lightbox-image" />
        <div class="lightbox-counter" v-if="hasMultiple">
          {{ currentIndex + 1 }} / {{ images.length }}
        </div>
      </div>
      
      <button 
        v-if="hasMultiple" 
        class="lightbox-nav lightbox-next" 
        @click="handleNext"
      >
        ›
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.lightbox-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.lightbox-overlay.active {
  opacity: 1;
}

.lightbox-close {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  z-index: 10;
}

.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10;
}

.lightbox-nav:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-50%) scale(1.1);
}

.lightbox-prev {
  left: 20px;
}

.lightbox-next {
  right: 20px;
}

.lightbox-content {
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.lightbox-image {
  max-width: 90vw;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.lightbox-counter {
  margin-top: 16px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

@media (max-width: 768px) {
  .lightbox-nav {
    width: 44px;
    height: 44px;
    font-size: 24px;
  }
  
  .lightbox-prev {
    left: 10px;
  }
  
  .lightbox-next {
    right: 10px;
  }
}
</style>
