import { mockBlocks } from '../utils/mockData'

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export const blockService = {
  getAll: async () => {
    await delay(500)
    return { data: mockBlocks }
  },

  getById: async (id) => {
    await delay(300)
    const block = mockBlocks.find(b => b.id === id)
    return { data: block }
  },

  create: async (data) => {
    await delay(500)
    const newBlock = {
      ...data,
      id: mockBlocks.length + 1,
      block_id: `B00${mockBlocks.length + 1}`
    }
    return { data: newBlock }
  },

  update: async (id, data) => {
    await delay(500)
    const index = mockBlocks.findIndex(b => b.id === id)
    if (index !== -1) {
      return { data: { ...mockBlocks[index], ...data } }
    }
    throw new Error('Block not found')
  },

  delete: async (id) => {
    await delay(500)
    return { data: { success: true } }
  }
}

export default blockService

