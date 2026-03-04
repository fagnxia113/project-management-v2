import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})

global.matchMedia = global.matchMedia || function () {
  return {
    matches: false,
    addListener: function () {},
    removeListener: function () {},
  }
}
