import { useState } from 'react'
import { X } from 'lucide-react'
import { useLanguage } from '../../i18n/useLanguage.js'
import { PRODUCT_STATUSES, PRODUCT_TYPES } from '../../domains/products/model.js'
import { appendProduct, patchProduct } from '../../domains/products/mutations.js'

const UOM_OPTIONS = ['ea', 'kg', 'g', 'm', 'cm', 'mm', 'm²', 'm³', 'l', 'ml', 'pc', 'set', 'lot']

/**
 * @param {{
 *   db: import('../../data/mockDatabase.js').MockDatabase
 *   product?: import('../../domains/products/model.js').Product | null
 *   onClose: () => void
 *   onSaved: (productId: string) => void
 * }} props
 */
export default function ProductFormModal({ db, product, onClose, onSaved }) {
  const { t } = useLanguage()
  const isEdit = !!product

  const [form, setForm] = useState({
    name:             product?.name          ?? '',
    type:             product?.type          ?? 'finished_good',
    status:           product?.status        ?? 'draft',
    uom:              product?.uom           ?? 'ea',
    uom2:             product?.uom2          ?? '',
    uomCoef:          product?.uomCoef       != null ? String(product.uomCoef) : '',
    priceAverage:     product?.priceAverage  != null ? String(product.priceAverage) : '',
    description:      product?.description   ?? '',
    customerId:       product?.customerId    ?? '',
    canBePurchased:   product?.canBePurchased   ?? false,
    canBeManufactured:product?.canBeManufactured ?? true,
    canBeSold:        product?.canBeSold        ?? true,
  })
  const [error, setError] = useState('')

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError(t('products.fieldName') + ' is required.'); return }
    setError('')

    const patch = {
      name:             form.name.trim(),
      type:             form.type,
      status:           form.status,
      uom:              form.uom,
      uom2:             form.uom2.trim() || undefined,
      uomCoef:          form.uomCoef ? parseFloat(form.uomCoef) : undefined,
      priceAverage:     form.priceAverage ? parseFloat(form.priceAverage) : undefined,
      description:      form.description.trim() || undefined,
      customerId:       form.customerId || undefined,
      canBePurchased:   form.canBePurchased,
      canBeManufactured:form.canBeManufactured,
      canBeSold:        form.canBeSold,
    }

    if (isEdit) {
      patchProduct(db, product.id, patch)
      onSaved(product.id)
    } else {
      const created = appendProduct(db, patch)
      onSaved(created.id)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {isEdit ? t('products.editProduct') : t('products.newProduct')}
            </h2>
            {isEdit ? (
              <p className="mt-0.5 text-xs text-slate-500">{product.sku}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
            aria-label={t('common.close')}
          >
            <X size={14} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          ) : null}

          {/* Name */}
          <Field label={t('products.fieldName')} required>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="input-base"
              placeholder="e.g. Precision Housing"
            />
          </Field>

          {/* Type + Status */}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('products.fieldType')}>
              <select value={form.type} onChange={(e) => handleChange('type', e.target.value)} className="input-base">
                {PRODUCT_TYPES.map((tp) => (
                  <option key={tp} value={tp}>{t(`product.type.${tp}`)}</option>
                ))}
              </select>
            </Field>
            <Field label={t('products.fieldStatus')}>
              <select value={form.status} onChange={(e) => handleChange('status', e.target.value)} className="input-base">
                {PRODUCT_STATUSES.map((s) => (
                  <option key={s} value={s}>{t(`products.status.${s}`)}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* UOM row */}
          <div className="grid grid-cols-3 gap-3">
            <Field label={t('products.fieldUom')}>
              <select value={form.uom} onChange={(e) => handleChange('uom', e.target.value)} className="input-base">
                {UOM_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
            <Field label={t('products.fieldUom2')}>
              <input
                type="text"
                value={form.uom2}
                onChange={(e) => handleChange('uom2', e.target.value)}
                className="input-base"
                placeholder="e.g. m"
              />
            </Field>
            <Field label={t('products.fieldUomCoef')}>
              <input
                type="number"
                min="0"
                step="any"
                value={form.uomCoef}
                onChange={(e) => handleChange('uomCoef', e.target.value)}
                className="input-base"
                placeholder="1.0"
              />
            </Field>
          </div>

          {/* Price */}
          <Field label={t('products.fieldPriceAverage')}>
            <input
              type="number"
              min="0"
              step="any"
              value={form.priceAverage}
              onChange={(e) => handleChange('priceAverage', e.target.value)}
              className="input-base"
              placeholder="0.00"
            />
          </Field>

          {/* Capabilities */}
          <fieldset className="rounded-lg border border-slate-200 p-3">
            <legend className="px-1 text-xs font-medium text-slate-600">Capabilities</legend>
            <div className="flex flex-wrap gap-4 pt-1">
              {[
                ['canBePurchased',    t('products.canBePurchased')],
                ['canBeManufactured', t('products.canBeManufactured')],
                ['canBeSold',         t('products.canBeSold')],
              ].map(([field, label]) => (
                <label key={field} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form[field]}
                    onChange={(e) => handleChange(field, e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Customer */}
          <Field label={t('products.fieldCustomer')}>
            <select value={form.customerId} onChange={(e) => handleChange('customerId', e.target.value)} className="input-base">
              <option value="">{t('common.none')}</option>
              {db.clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          {/* Description */}
          <Field label={t('products.fieldDescription')}>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="input-base resize-none"
              placeholder="Optional product description…"
            />
          </Field>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              {t('common.cancel')}
            </button>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
              {isEdit ? t('products.saved') : t('products.created')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-slate-600">
        {label}{required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>
      {children}
    </div>
  )
}
