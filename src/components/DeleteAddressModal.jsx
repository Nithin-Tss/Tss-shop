export default function DeleteAddressModal({
  isOpen,
  onClose,
  onConfirm,
  address = null,
  deleting = false,
}) {
  if (!isOpen || !address) return null;

  const fullName = [address.first_name, address.last_name].filter(Boolean).join(" ");
  const street = address.address_line_1;
  const location = [address.city, address.state, address.postal_code, address.country]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 text-lg">
            ⚠
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Delete Address</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to delete this address?
            </p>
          </div>
        </div>

        {/* Address Preview Box */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-700 space-y-1">
          {fullName && <div className="font-semibold text-slate-900">{fullName}</div>}
          {address.company && <div className="text-slate-500">{address.company}</div>}
          <div>{street}</div>
          {address.address_line_2 && <div>{address.address_line_2}</div>}
          <div>{location}</div>
          {address.is_default && (
            <div className="pt-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                Default {address.address_type} address
              </span>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-500">
          This action cannot be undone. If this is a default address, another saved address will automatically be selected as default.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
          >
            {deleting ? (
              <>
                <span className="inline-block animate-spin">↻</span>
                <span>Deleting...</span>
              </>
            ) : (
              <span>Delete Address</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
