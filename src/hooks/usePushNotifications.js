import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase.js'
import { useApp } from '../context/AppContext.jsx'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

export function usePushNotifications() {
  const { userId, activeWorkspaceId } = useApp()
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY
    setSupported(ok)
    if (ok) setPermission(Notification.permission)
  }, [])

  useEffect(() => {
    if (!supported || !userId) return
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      setSubscribed(!!sub)
    }).catch((err) => {
      console.warn('Push: failed to check subscription status', err)
    })
  }, [supported, userId])

  const subscribe = useCallback(async () => {
    if (!supported || !userId || !activeWorkspaceId) return
    setLoading(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return

      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })
      }

      const { endpoint, keys } = sub.toJSON()
      const { error: dbError } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: userId,
          workspace_id: activeWorkspaceId,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        { onConflict: 'user_id,endpoint' },
      )
      if (dbError) throw new Error('Notifikace nelze uložit: ' + dbError.message)
      setSubscribed(true)
    } catch (err) {
      console.error('Push subscribe:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supported, userId, activeWorkspaceId])

  const unsubscribe = useCallback(async () => {
    if (!supported || !userId) return
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        const { endpoint } = sub.toJSON()
        await sub.unsubscribe()
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId)
          .eq('endpoint', endpoint)
      }
      setSubscribed(false)
    } catch (err) {
      console.error('Push unsubscribe:', err)
    } finally {
      setLoading(false)
    }
  }, [supported, userId])

  return { supported, permission, subscribed, loading, subscribe, unsubscribe }
}
