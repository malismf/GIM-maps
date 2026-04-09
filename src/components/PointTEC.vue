<template>
    <div class = "pointtec-container">
    <h1>Point TEC</h1>
    <input type="text" v-model="latitude" placeholder="Latitude" class="pointtec-input" />
    <input type="text" v-model="longitude" placeholder="Longitude" class="pointtec-input" />
    <button @click="fetchPointTEC" class="pointtec-btn">Fetch TEC</button>

    <div class = "chart-container">
      <canvas id="pointTecChart"></canvas>
    </div>  
    </div>
</template>

<script>
props = {
  forecastId: {
    type: [String, Number],
    default: null
  }
}

</script>
<style scoped>
.pointtec-input {
  padding: 8px;
  margin: 8px;
  border: 1px solid var(--border-color, #ccc);
  border-radius: 4px;
  width: 150px;
}
.pointtec-btn {
  padding: 8px 16px;
  background-color: var(--primary-color, #007bff);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.pointtec-btn:hover {
  background-color: var(--primary-color-dark, #0056b3);
}

</style>
