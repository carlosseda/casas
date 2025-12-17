import { configureStore } from '@reduxjs/toolkit'
import mapReducer from './map-slice'

export const store = configureStore({
  reducer: {
    map: mapReducer
  }
})

export default store
