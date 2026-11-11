const DB_NAME = 'sample-photos'
const STORE = 'photos'

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function runTransaction(mode, work) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const request = work(tx.objectStore(STORE))
        tx.oncomplete = () => {
          db.close()
          resolve(request ? request.result : undefined)
        }
        tx.onerror = () => {
          db.close()
          reject(tx.error)
        }
        tx.onabort = () => {
          db.close()
          reject(tx.error)
        }
      }),
  )
}

// slot is 'front' or 'back'; blob is the original photo file
export async function savePhoto(slot, blob) {
  try {
    await runTransaction('readwrite', (store) => store.put(blob, slot))
  } catch (err) {
    console.warn('Could not save the photo on this device:', err)
  }
}

export async function loadSample() {
  try {
    const front = await runTransaction('readonly', (store) => store.get('front'))
    const back = await runTransaction('readonly', (store) => store.get('back'))
    return { front: front || null, back: back || null }
  } catch (err) {
    console.warn('Could not read the saved photos:', err)
    return { front: null, back: null }
  }
}

export async function clearSample() {
  try {
    await runTransaction('readwrite', (store) => store.clear())
  } catch (err) {
    console.warn('Could not clear the saved photos:', err)
  }
}