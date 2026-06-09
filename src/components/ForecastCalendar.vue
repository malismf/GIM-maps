<template>
  <h2>Available forecast dates</h2>
  <div class="calendar-container">
    <div class="calendar-header">
      <button @click="prevMonth" class="nav-btn" :disabled="!canGoPrev"><img src = "../assets/icons/IconBackward.svg"></button>

      <div class="month-year-wrapper" ref="monthYearWrapper">
        <div class="month-year-trigger" :class="{ 'dropdown-open': dropdownOpen }" @click="toggleMonthYearDropdown">
          <span class="month-year-text">
            {{ getMonthName(currentMonth) }} {{ currentYear }}
          </span>
          <span class="month-year-arrow">▼</span>
        </div>

        <div v-if="dropdownOpen" class="month-year-dropdown" :style="{ maxHeight: dropdownMaxHeight }">
          <div class="month-column" :style="{ maxHeight: columnsMaxHeight }">
            <span class="month-column-title">Month</span>
            <div
              v-for="m in visibleMonths"
              :key="m"
              :class="['month-item', { active: m === currentMonth && hoveredOrCurrentYear === currentYear }]"
              @click="selectMonthFromDropdown(m)"
            >
              {{ getMonthName(m) }}
            </div>
          </div>
          <div class="year-column" :style="{ maxHeight: columnsMaxHeight }">
            <span class="year-column-title">Year</span>
            <div
              v-for="y in availableYears"
              :key="y"
              :class="['year-item', { active: y === hoveredOrCurrentYear }]"
              @mouseenter="hoverYear = y"
              @click="selectYearFromDropdown(y)"
            >
              {{ y }}
            </div>
          </div>
        </div>
      </div>

      <button @click="nextMonth" class="nav-btn" :disabled="!canGoNext"><img src = "../assets/icons/IconForward.svg"></button>
    </div>
    <div class="calendar-grid">
      <div v-for="weekday in weekdays" :key="weekday" class="weekday">{{ weekday }}</div>
      <div v-for="blank in blanks" :key="`blank-${blank}`" class="blank-day"></div>
      <div
        v-for="day in daysInMonth"
        :key="day"
        :class="getClassesForDay(day)"
        @click="selectDate(day)"
      >
        {{ day }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    forecasts: {
      type: Array,
      default: () => []
    }
  },
  emits: ['forecast-selected'],

  data() {
    const today = new Date();
    return {
      today,
      selectedDate: null,
      currentMonth: today.getMonth(),
      currentYear: today.getFullYear(),
      weekdays:['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      minForecastDate: null,
      maxForecastDate: null,

      dropdownOpen: false,
      hoverYear: null,
      dropdownMaxHeight: 'auto',
      columnsMaxHeight: 'auto',
    };
  },

  mounted() {
    // Закрываем дропдаун при клике вне него
    document.addEventListener('click', this.handleClickOutside);
    window.addEventListener('resize', this.updateDropdownHeight);
  },

  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside);
    window.removeEventListener('resize', this.updateDropdownHeight);
  },

  computed: {
    daysInMonth() {
      return new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    },

    firstDayOfMonth() {
      let day = new Date(this.currentYear, this.currentMonth, 1).getDay();
      // Корректируем день недели: JS считает с ВС (0), нам нужен ПН (0)
      return day === 0 ? 6 : day - 1;
    },

    blanks() {
      const blankCount = this.firstDayOfMonth;
      return Array.from({ length: blankCount }, (_, i) => i);
    },

    monthYear() {
      const date = new Date(this.currentYear, this.currentMonth);
      return `${date.toLocaleString('en-US', { month: 'long' })} ${this.currentYear}`;
    },

    // Создает множество дат (в формате 'YYYY-MM-DD'), для которых есть прогнозы.
    // Используется для быстрой проверки доступности даты.
    availableDates() {
      if (!this.forecasts || !Array.isArray(this.forecasts)) {
        return new Set();
      }
      const dates = new Set();
      this.forecasts.forEach(forecast => {
        const dateStr = forecast.forecast_start_date || forecast.forecast_end_date;

        if (dateStr) {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            const dateKey = date.getFullYear() + '-' +
                           String(date.getMonth() + 1).padStart(2, '0') + '-' +
                           String(date.getDate()).padStart(2, '0');
            dates.add(dateKey);
          }
        }
      });
      return dates;
    },

    previousDates() {
      if (!this.availableDates || this.availableDates.size === 0) {
        return new Set();
      }
      const prevDates = new Set();
      const todayNorm = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());

      this.availableDates.forEach(dateKey => {
        const [year, month, day] = dateKey.split('-').map(Number);
        const cellNorm = new Date(year, month - 1, day);
        if (cellNorm < todayNorm) {
          prevDates.add(dateKey);
        }
      });

      return prevDates;
    },

    canGoPrev() {
      if (!this.minForecastDate) return false;
      const firstDayOfCurrentMonth = new Date(this.currentYear, this.currentMonth, 1);
      return firstDayOfCurrentMonth > this.minForecastDate;
    },
    canGoNext() {
      if (!this.maxForecastDate) return false;
      const lastDayOfCurrentMonth = new Date(this.currentYear, this.currentMonth + 1, 0);
      return lastDayOfCurrentMonth < this.maxForecastDate;
    },

    // Словарь: год -> массив доступных месяцев (индексы 0-11)
    availableMonthsByYear() {
      const monthsByYear = {};
      this.availableDates.forEach(dateStr => {
        const [year, month, day] = dateStr.split('-').map(Number);
        const yearKey = year;
        const monthIndex = month - 1; // Преобразуем в индекс месяца (0-11)
        
        if (!monthsByYear[yearKey]) {
          monthsByYear[yearKey] = new Set();
        }
        monthsByYear[yearKey].add(monthIndex);
      });
      
      // Преобразуем Set в отсортированные массивы
      const result = {};
      Object.keys(monthsByYear).forEach(year => {
        result[year] = Array.from(monthsByYear[year]).sort((a, b) => a - b);
      });
      return result;
    },

    // Массив доступных годов (отсортированный)
    availableYears() {
      return Object.keys(this.availableMonthsByYear)
        .map(Number)
        .sort((a, b) => a - b);
    },

    // Год на основе hover или текущего выбора
    hoveredOrCurrentYear() {
      return this.hoverYear || this.currentYear;
    },

    // массив доступных месяцев для года
    visibleMonths() {
      if (!this.hoveredOrCurrentYear || !this.availableMonthsByYear[this.hoveredOrCurrentYear]) {
        return [];
      }
      return this.availableMonthsByYear[this.hoveredOrCurrentYear];
    },
  },

  methods: {
    prevMonth() {
      if (this.currentMonth === 0) {
        this.currentMonth = 11;
        this.currentYear--;
      } else {
        this.currentMonth--;
      }
    },

    nextMonth() {
      if (this.currentMonth === 11) {
        this.currentMonth = 0;
        this.currentYear++;
      } else {
        this.currentMonth++;
      }
    },

    selectDate(day) {
      if (this.isDateAvailable(day)) {
        const clickedDate = new Date(this.currentYear, this.currentMonth, day);
        this.selectedDate = clickedDate;

        const selectedForecast = this.findForecastForDate(clickedDate);
        if (selectedForecast) {
          this.$emit('forecast-selected', selectedForecast);
        }
      }
    },

    isSelected(day) {
      if (!this.selectedDate) return false;
      return (
        this.selectedDate.getDate() === day &&
        this.selectedDate.getMonth() === this.currentMonth &&
        this.selectedDate.getFullYear() === this.currentYear
      );
    },

    isDateAvailable(day) {
      const dateKey = this.currentYear + '-' +
                     String(this.currentMonth + 1).padStart(2, '0') + '-' +
                     String(day).padStart(2, '0');
      return this.availableDates.has(dateKey);
    },

    isPreviousForecast(day) {
      const dateKey = this.currentYear + '-' +
                      String(this.currentMonth + 1).padStart(2, '0') + '-' +
                      String(day).padStart(2, '0');
      return this.previousDates.has(dateKey);
    },

    getClassesForDay(day) {
      return [
        'calendar-day',
        {
          'selected': this.isSelected(day),
          'available': this.isDateAvailable(day),
          'previous-forecast': this.isPreviousForecast(day),
          'clickable': this.isDateAvailable(day)
        }
      ];
    },

    findForecastForDate(date) {
      return this.forecasts.find(forecast => {
        const forecastDate = new Date(forecast.forecast_start_date || forecast.forecast_end_date);
        return forecastDate.toDateString() === date.toDateString();
      });
    },

    selectTodayForecast() {
      if  (this.forecasts && this.forecasts.length > 0) {
        // находим прогноз за сегодняшний день
        const todayForecast = this.forecasts.find(forecast => {
            const forecastDate = new Date(forecast.forecast_start_date || forecast.forecast_end_date);
            return forecastDate.toDateString() === this.today.toDateString();
        });

        if (todayForecast) {
          this.selectedDate = new Date(todayForecast.forecast_start_date || todayForecast.forecast_end_date);
          this.currentMonth = this.selectedDate.getMonth();
          this.currentYear = this.selectedDate.getFullYear();
          this.$emit('forecast-selected', todayForecast);
        }
      }

    },

    updateMinMaxDates() {
      if (!this.forecasts || this.forecasts.length === 0) {
        this.minForecastDate = null;
        this.maxForecastDate = null;
        return;
      }
      const dates = this.forecasts.map(f => new Date(f.forecast_start_date || f.date));
      this.minForecastDate = new Date(Math.min.apply(null, dates));
      this.maxForecastDate = new Date(Math.max.apply(null, dates));
    },

    getMonthName(monthIndex) {
      const date = new Date(2000, monthIndex, 1);
      return date.toLocaleString('en-US', { month: 'long' });
    },

    // управление кастомным дропдауном месяца/года
    toggleMonthYearDropdown() {
      this.dropdownOpen = !this.dropdownOpen;
      if (!this.dropdownOpen) {
        this.hoverYear = null;
      }
    },

    selectYearFromDropdown(year) {
      this.hoverYear = year;
      // сразу переключаем текущий год
      this.currentYear = year;
      // если текущий месяц недоступен для этого года — выбираем первый доступный
      const months = this.availableMonthsByYear[year] || [];
      if (months.length > 0 && !months.includes(this.currentMonth)) {
        this.currentMonth = months[0];
      }
    },

    selectMonthFromDropdown(monthIndex) {
      // устанавливаем месяц и год (учитывая hoverYear)
      const targetYear = this.hoveredOrCurrentYear;
      if (targetYear) {
        this.currentYear = targetYear;
      }
      this.currentMonth = monthIndex;

      this.dropdownOpen = false;
      this.hoverYear = null;
    },

    handleClickOutside(event) {
      if (!this.dropdownOpen) return;
      const wrapper = this.$refs.monthYearWrapper;
      if (wrapper && !wrapper.contains(event.target)) {
        this.dropdownOpen = false;
        this.hoverYear = null;
      }
    },

    updateDropdownHeight() {
      if (!this.dropdownOpen || !this.$refs.monthYearWrapper) return;
      
      const trigger = this.$refs.monthYearWrapper.querySelector('.month-year-trigger');
      if (!trigger) return;
      
      const triggerRect = trigger.getBoundingClientRect();
      const dropdownBottomPosition = triggerRect.bottom;
      const viewportHeight = window.innerHeight;
      const availableHeight = viewportHeight - dropdownBottomPosition - 8; 
      
      const dropdownHeight = Math.max(availableHeight, 200); 
      this.dropdownMaxHeight = `${dropdownHeight}px`;
      
      const headerHeight = 30;
      const columnsHeight = dropdownHeight - headerHeight;
      this.columnsMaxHeight = `${Math.max(columnsHeight, 150)}px`;
    },
  
  },


  watch: {
    forecasts: {
      handler(newForecasts) {
        this.updateMinMaxDates();
        if (newForecasts && newForecasts.length > 0) {
          this.selectTodayForecast();
        } else {
          this.selectedDate = null;
        }
      },
      immediate: true
    },
    dropdownOpen(newVal) {
      if (newVal) {
        this.$nextTick(() => this.updateDropdownHeight());
      }
    }
  }
};
</script>

<style scoped>


.calendar-container {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  background-color: var(--panel-background, #ffffff);
  border: 1px solid var(--border-color, #ddd);
  border-radius: var(--border-radius, 8px);
  padding: var(--spacing-lg, 20px);
}

.calendar-container h2 {
  margin: 0 0 var(--spacing-md, 16px) 0;
  font-size: var(--font-size-xl, 1.25rem);
  color: var(--text-color, #333);
  text-align: center;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md, 16px);
  padding: 0 var(--spacing-xs, 8px);
  gap: var(--spacing-xs, 8px);
  flex-wrap: nowrap;
}

.month-year-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  justify-content: center;
}

.month-year-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: var(--spacing-sm, 12px) var(--spacing-md, 16px);
  font-size: var(--font-size-md, 1rem);
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  color: #002033;
  border-radius: 5px;
  border: 1.5px solid white;
  background-color: white;
  cursor: pointer;
  box-sizing: border-box;
  min-width: 160px;
  max-width: 220px;
  height: 44px;
  transition: 0.25s;
}

.calendar-container:hover .month-year-trigger:not(:hover):not(.dropdown-open) {
  border-color: #dedede;
  background-color: #fafafa;
}

.month-year-trigger.dropdown-open {
  border-color: #007bff;
}

.month-year-trigger:hover {
  border-color: #007bff;
}


.month-year-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.month-year-arrow {
  font-size: 0.75rem;
  color: #8a9aa5;
}

.month-year-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  padding: 8px;
  background-color: #ffffff;
  border-radius: 8px;
  border: 1px solid #d7dde3;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
  z-index: 10;
  min-width: 260px;
}

.month-column,
.year-column {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  overflow-x: hidden;
  
  padding-right: 2px;
}


.month-column-title,
.year-column-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7780;
  padding: 4px 6px;
}

.current-month-button {
  margin-top: 6px;
  padding: 8px 10px;
  background: #ffffff;
  border: 1px solid #d7dde3;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  color: #002033;
}

.current-month-button:hover {
  background: #f6f8fa;
}

.month-column {
  min-width: 150px;
}

.year-column {
  min-width: 80px;
}

.month-item,
.year-item {
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: var(--font-size-sm, 0.875rem);
  color: #002033;
  transition: background-color 0.15s ease, color 0.15s ease;
  white-space: nowrap;
}

.month-item:hover,
.year-item:hover {
  background-color: #f0f2f5;
}

.month-item.active,
.year-item.active {
  background-color: #007bff;
  color: #ffffff;
}

.nav-btn {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-sizing: border-box;
}

.nav-btn img {
  width: 20px;
  height: 20px;
  object-fit: contain;
  flex-shrink: 0;
  display: block;
}

.nav-btn:hover:not(:disabled) {
  background-color: rgb(229, 232, 236);
  border-radius: 5px;
  transform: scale(120%);
}

.nav-btn:focus {
  outline: none;
  box-shadow: none;
}

.nav-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.18);
}

.nav-btn:disabled {
  cursor: default;
  background-color: transparent;
  filter: opacity(0.5);
  border-color: #eee;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.weekday, .calendar-day, .blank-day {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 40px;
  text-align: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.weekday {
  font-weight: 600;
  color: #b3bcc2;
  font-size: var(--font-size-xs, 0.75rem);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.calendar-day {
  cursor: default;
  color: #002033;
  font-size: var(--font-size-sm, 0.875rem);
  font-weight: 500;
  position: relative;
  border: 1px solid transparent;
}

.calendar-day.clickable {
  cursor: pointer;
  color: var(--text-color, #333);
}

.calendar-day.clickable:hover {
  background-color: var(--background-color, #f0f2f5);
  border-color: var(--border-color, #ddd);
}

.calendar-day.available {
  background-color: #189F0B;
  color: white;
  font-weight: 600;
  border-color: #189F0B;
}

.calendar-day.available:not(.selected):hover {
  background-color: #21ca12;
  border-color: #21ca12;
  transform: scale(1.05);
}

.calendar-day.selected.available {
  background-color: #189F0B;
  color: #189F0B;
  font-weight: 700;
  position: relative;
  z-index: 1;
  border-color: #189F0B;
}

.calendar-day.selected.available::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 28px;
  height: 28px;
  background-color: #fdf6c3;
  border-radius: 50%;
  z-index: -1;
}

.calendar-day.previous-forecast {
  background-color: #3B82F6;
  color: #ffffff;
  font-weight: 600;
  border-color: #3B82F6;
}

.calendar-day.previous-forecast:not(.selected):hover {
  background-color: #60A5FA;
  border-color: #60A5FA;
  transform: scale(1.05);
}

.calendar-day.selected.previous-forecast {
  background-color: #3B82F6;
  color: #3B82F6;
  font-weight: 700;
  position: relative;
  z-index: 1;
  border-color: #3B82F6;
}

.calendar-day.selected.previous-forecast::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 28px;
  height: 28px;
  background-color: #fdf6c3;
  border-radius: 50%;
  z-index: -1;
}

.blank-day {
  background-color: transparent;
}

/* Адаптивность для планшетов */
@media (max-width: 1024px) {
  .calendar-container {
    padding: var(--spacing-md, 16px);
  }

  .calendar-container h2 {
    font-size: var(--font-size-lg, 1.125rem);
  }

  .month-select {
    font-size: var(--font-size-sm, 0.875rem);
    padding: var(--spacing-xs, 8px) var(--spacing-sm, 12px);
    width: 105px;
    height: 40px;
  }

  .year-select {
    font-size: var(--font-size-sm, 0.875rem);
    padding: var(--spacing-xs, 8px) var(--spacing-sm, 12px);
    width: 75px;
    height: 40px;
  }

  .nav-btn {
    min-width: 32px;
    min-height: 32px;
    max-width: 32px;
    max-height: 32px;
  }

  .weekday, .calendar-day, .blank-day {
    height: 36px;
  }

  .weekday {
    font-size: var(--font-size-xs, 0.75rem);
  }

  .calendar-day {
    font-size: var(--font-size-xs, 0.75rem);
  }

  .calendar-day.selected.previous-forecast::before {
    width: 32px;
    height: 32px;
  }
}

/* Адаптивность для мобильных устройств */
@media (max-width: 768px) {
  .calendar-container {
    padding: var(--spacing-sm, 12px);
  }

  .calendar-container h2 {
    font-size: var(--font-size-md, 1rem);
    margin-bottom: var(--spacing-sm, 12px);
  }

  .calendar-header {
    margin-bottom: var(--spacing-sm, 12px);
  }

  .month-select {
    font-size: var(--font-size-xs, 0.75rem);
    padding: var(--spacing-xs, 6px) var(--spacing-sm, 10px);
    width: 90px;
    height: 36px;
  }

  .year-select {
    font-size: var(--font-size-xs, 0.75rem);
    padding: var(--spacing-xs, 6px) var(--spacing-sm, 10px);
    width: 65px;
    height: 36px;
  }

  .nav-btn {
    min-width: 32px;
    min-height: 32px;
    max-width: 32px;
    max-height: 32px;
    padding: var(--spacing-xs, 6px);
  }

  .weekday, .calendar-day, .blank-day {
    height: 40px;
  }

  .weekday {
    font-size: var(--font-size-xs, 0.75rem);
  }

  .calendar-day {
    font-size: var(--font-size-sm, 0.875rem);
  }

  .calendar-day.selected.available::before {
    width: 32px;
    height: 32px;
  }

  .calendar-day.selected.previous-forecast::before {
    width: 32px;
    height: 32px;
  }
}

/* Адаптивность для очень маленьких экранов */
@media (max-width: 480px) {
  .calendar-container {
    padding: var(--spacing-xs, 8px);
  }

  .calendar-container h2 {
    font-size: var(--font-size-sm, 0.875rem);
  }

  .month-select {
    font-size: var(--font-size-xs, 0.75rem);
    padding: var(--spacing-xs, 6px);
    width: 80px;
    height: 32px;
  }

  .year-select {
    font-size: var(--font-size-xs, 0.75rem);
    padding: var(--spacing-xs, 6px);
    width: 60px;
    height: 32px;
  }

  .nav-btn {
    min-width: 28px;
    min-height: 28px;
    max-width: 28px;
    max-height: 28px;
    padding: var(--spacing-xs, 4px);
  }

  .weekday, .calendar-day, .blank-day {
    height: 32px;
  }

  .weekday {
    font-size: var(--font-size-xs, 0.75rem);
  }

  .calendar-day {
    font-size: var(--font-size-xs, 0.75rem);
  }

  .calendar-day.selected.available::before {
    width: 24px;
    height: 24px;
  }

  .calendar-day.selected.previous-forecast::before {
    width: 24px;
    height: 24px;
  }
}

/* Улучшения для touch-устройств */
@media (hover: none) and (pointer: coarse) {
  .nav-btn {
    min-height: 44px;
    min-width: 44px;
  }

  .calendar-day.clickable {
    min-height: 44px;
  }

  .calendar-container {
    border-width: 2px;
  }
}


</style>