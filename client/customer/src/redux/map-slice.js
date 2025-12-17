import { createSlice } from '@reduxjs/toolkit'

export const mapSlice = createSlice({
  name: 'map',
  initialState: {
    elements: [],
    pinElement: {
      title: null,
      longitude: null,
      latitude: null
    },
    threadId: null
  },
  reducers: {
    setPinElement: (state, action) => {
      state.pinElement = action.payload
    },
    setElements: (state, action) => {
      state.elements = action.payload
    },
    setThreadId: (state, action) => {
      state.threadId = action.payload
    }
  }
})

export const { setPinElement, setElements, setThreadId } = mapSlice.actions

export default mapSlice.reducer
