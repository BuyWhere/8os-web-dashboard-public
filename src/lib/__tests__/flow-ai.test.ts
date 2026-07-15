/**
 * Flow AI client tests — focused on 402 payment-required detection/alerting.
 */

import {
  createChatCompletion,
  createStreamingChatCompletion,
  FlowAiPaymentRequiredError,
  alertFlowAiPaymentRequired,
} from '../flow-ai'
import { captureException, captureMessage } from '../monitoring/posthog'
import { notifyTelegram } from '../monitoring/telegram'

jest.mock('../monitoring/posthog')
jest.mock('../monitoring/telegram')

const mockedCaptureException = jest.mocked(captureException)
const mockedCaptureMessage = jest.mocked(captureMessage)
const mockedNotifyTelegram = jest.mocked(notifyTelegram)

describe('Flow AI client', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('createChatCompletion', () => {
    it('returns parsed JSON on success', async () => {
      const payload = {
        id: 'test-id',
        object: 'chat.completion',
        created: 1,
        model: 'gpt-4o',
        choices: [],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(payload),
      } as unknown as Response)

      const result = await createChatCompletion([{ role: 'user', content: 'hello' }])
      expect(result).toEqual(payload)
    })

    it('throws FlowAiPaymentRequiredError and alerts on 402', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 402,
        text: jest.fn().mockResolvedValue('Payment Required: trial expired'),
      } as unknown as Response)

      await expect(
        createChatCompletion([{ role: 'user', content: 'hello' }])
      ).rejects.toMatchObject({ name: 'FlowAiPaymentRequiredError' })

      expect(mockedCaptureException).toHaveBeenCalledTimes(1)
      expect(mockedCaptureMessage).toHaveBeenCalledTimes(1)
      expect(mockedNotifyTelegram).toHaveBeenCalledTimes(1)
      expect(mockedNotifyTelegram.mock.calls[0][0]).toContain('Flow AI 402')
    })

    it('throws a generic error for other non-2xx responses without alerting', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal Server Error'),
      } as unknown as Response)

      await expect(
        createChatCompletion([{ role: 'user', content: 'hello' }])
      ).rejects.toThrow('Flow AI API error: 500 - Internal Server Error')

      expect(mockedCaptureException).not.toHaveBeenCalled()
      expect(mockedNotifyTelegram).not.toHaveBeenCalled()
    })
  })

  describe('createStreamingChatCompletion', () => {
    it('returns the response body on success', async () => {
      const body = new ReadableStream()
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body,
      } as unknown as Response)

      const result = await createStreamingChatCompletion([{ role: 'user', content: 'hello' }])
      expect(result).toBe(body)
    })

    it('throws FlowAiPaymentRequiredError and alerts on 402', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 402,
        text: jest.fn().mockResolvedValue('Payment Required: plan expired'),
      } as unknown as Response)

      await expect(
        createStreamingChatCompletion([{ role: 'user', content: 'hello' }])
      ).rejects.toMatchObject({ name: 'FlowAiPaymentRequiredError' })

      expect(mockedCaptureException).toHaveBeenCalledTimes(1)
      expect(mockedCaptureMessage).toHaveBeenCalledTimes(1)
      expect(mockedNotifyTelegram).toHaveBeenCalledTimes(1)
    })
  })

  describe('alertFlowAiPaymentRequired', () => {
    it('calls all three alerting sinks', async () => {
      await alertFlowAiPaymentRequired('trial expired')
      expect(mockedCaptureException).toHaveBeenCalledTimes(1)
      expect(mockedCaptureMessage).toHaveBeenCalledTimes(1)
      expect(mockedNotifyTelegram).toHaveBeenCalledTimes(1)
    })

    it('never throws even when alerting sinks reject', async () => {
      mockedCaptureException.mockRejectedValue(new Error('posthog down'))
      mockedCaptureMessage.mockRejectedValue(new Error('posthog down'))
      mockedNotifyTelegram.mockRejectedValue(new Error('telegram down'))

      await expect(alertFlowAiPaymentRequired('trial expired')).resolves.toBeUndefined()
    })
  })
})
