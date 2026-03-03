// Copyright 2024 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.
import '@testing-library/jest-dom'
import { expect, test, vi } from 'vitest'
import { render, getQueriesForElement } from '@lynx-js/react/testing-library'

import { App } from '../App.jsx'

test('App', async () => {
  const cb = vi.fn()

  render(
    <App
      onRender={() => {
        cb(`__MAIN_THREAD__: ${__MAIN_THREAD__}`)
      }}
    />,
  )
  expect(cb).toBeCalledTimes(1)
  expect(cb).toHaveBeenCalledWith('__MAIN_THREAD__: false')
  expect(elementTree.root).toBeTruthy()

  const { findByText } = getQueriesForElement(elementTree.root!)
  expect(await findByText('React')).toBeInTheDocument()
  expect(await findByText('on Lynx')).toBeInTheDocument()
  expect(await findByText('Tap the logo and have fun twice!')).toBeInTheDocument()
})
