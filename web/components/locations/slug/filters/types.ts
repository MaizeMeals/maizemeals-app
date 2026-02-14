export type FilterState = {
  search: string
  dietary: string[]
  minRating: number
  minMScale: number
  macros: {
    calories: [number, number]
    protein: [number, number]
    carbs: [number, number]
    fat: [number, number]
  }
}

export const INITIAL_FILTERS: FilterState = {
  search: "",
  dietary: [],
  minRating: 0,
  minMScale: 1,
  macros: {
    calories: [0, 2000],
    protein: [0, 100],
    carbs: [0, 150],
    fat: [0, 100]
  }
}
