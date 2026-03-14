'use client'

import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useToast } from './ui/Toast'


export function DeleteProductButton({ id, especie }: { id: string, especie: string }) {
    const router = useRouter()
    const [isDeleting, setIsDeleting] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)

    const { showToast } = useToast()

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const res = await fetch(`/api/productos/${id}`, { method: 'DELETE' })
            const data = await res.json()

            if (res.ok && data.success) {
                showToast('Producto eliminado correctamente', 'success')
                router.push('/productos')
                router.refresh()
            } else {
                showToast(`Error al eliminar: ${data.error}`, 'error')
            }
        } catch (error) {
            console.error(error)
            showToast('Error al intentar eliminar', 'error')
        } finally {
            setIsDeleting(false)
            setShowConfirm(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setShowConfirm(true)}
                disabled={isDeleting}
                className="btn btn-secondary"
                style={{
                    color: 'var(--red)',
                    borderColor: 'var(--red-soft)',
                    background: 'rgba(239, 68, 68, 0.05)'
                }}
                title="Eliminar Producto"
            >
                <Trash2 size={18} />
            </button>

            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20 animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">¿Eliminar producto?</h3>
                            <p className="text-gray-600 mb-6">
                                Estás a punto de eliminar el producto:
                                <br />
                                <span className="font-semibold text-gray-800">{id} - {especie}</span>
                                <br /><br />
                                Esta acción no se puede deshacer.
                            </p>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium transition-colors shadow-lg shadow-red-500/30 flex items-center gap-2"
                                >
                                    {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
