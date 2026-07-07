import { BookingDetail } from './api'

/**
 * Generates an invoice HTML for a booking
 */
export const generateInvoiceHTML = (booking: BookingDetail): string => {
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return '₹0'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  // Calculate breakdown (assuming platform fee is 20 and gateway fee is 2%)
  const totalAmount = booking.amount || 0
  const platformFee = 20
  const gatewayFee = Math.round(totalAmount * 0.02)
  const governmentTax = Math.max(0, totalAmount - platformFee - gatewayFee)

  const invoiceHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice - ${booking.bookingId}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      padding: 20px;
      background: #fff;
      width: 100%;
      overflow-x: hidden;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
      width: 100%;
      overflow-x: hidden;
    }
    .header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .company-info {
      text-align: center;
      margin-bottom: 20px;
    }
    .company-name {
      font-size: 28px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 5px;
      word-wrap: break-word;
    }
    .company-tagline {
      font-size: 14px;
      color: #64748b;
      word-wrap: break-word;
    }
    .invoice-title {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .invoice-meta {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
      flex-wrap: wrap;
      gap: 15px;
    }
    .invoice-meta-item {
      margin: 5px 0;
      flex: 1 1 auto;
      min-width: 120px;
    }
    .invoice-meta-label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
    }
    .invoice-meta-value {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
      word-wrap: break-word;
      word-break: break-all;
    }
    .section {
      margin: 30px 0;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #1e293b;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .details-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    .detail-item {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .detail-label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .detail-value {
      font-size: 14px;
      font-weight: 500;
      color: #1e293b;
      word-wrap: break-word;
      word-break: break-all;
      overflow-wrap: break-word;
    }
    .amount-breakdown {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .amount-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
      gap: 10px;
    }
    .amount-row span {
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .amount-row span:first-child {
      flex: 1;
      min-width: 0;
    }
    .amount-row span:last-child {
      flex-shrink: 0;
    }
    .amount-row:last-child {
      border-bottom: none;
    }
    .amount-row.total {
      font-weight: bold;
      font-size: 18px;
      border-top: 2px solid #2563eb;
      padding-top: 10px;
      margin-top: 10px;
    }
    .declaration {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 30px 0;
      border-radius: 4px;
    }
    .declaration-title {
      font-weight: 600;
      margin-bottom: 10px;
      color: #92400e;
    }
    .declaration-list {
      list-style: none;
      padding: 0;
    }
    .declaration-list li {
      padding: 5px 0;
      padding-left: 20px;
      position: relative;
      word-wrap: break-word;
    }
    .declaration-list li:before {
      content: "✔";
      position: absolute;
      left: 0;
      color: #059669;
      font-weight: bold;
    }
    .legal-footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      font-size: 11px;
      color: #64748b;
      text-align: center;
      line-height: 1.8;
      word-wrap: break-word;
    }
    .company-footer {
      margin-top: 20px;
      padding: 15px;
      background: #f8fafc;
      border-radius: 4px;
      text-align: center;
    }
    .company-footer-title {
      font-weight: 600;
      margin-bottom: 5px;
      color: #1e293b;
    }
    
    /* Mobile Responsive Styles */
    @media screen and (max-width: 768px) {
      body {
        padding: 12px;
      }
      .invoice-container {
        max-width: 100%;
        padding: 0;
      }
      .company-name {
        font-size: 20px;
      }
      .company-tagline {
        font-size: 12px;
      }
      .invoice-title {
        font-size: 20px;
      }
      .invoice-meta {
        flex-direction: column;
        gap: 10px;
      }
      .invoice-meta-item {
        width: 100%;
        min-width: 100%;
      }
      .section {
        margin: 20px 0;
      }
      .section-title {
        font-size: 16px;
      }
      .details-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }
      .detail-label {
        font-size: 11px;
      }
      .detail-value {
        font-size: 13px;
      }
      .amount-breakdown {
        padding: 15px;
        margin: 15px 0;
      }
      .amount-row {
        flex-direction: column;
        gap: 5px;
      }
      .amount-row.total {
        flex-direction: row;
        font-size: 16px;
      }
      .declaration {
        padding: 12px;
        margin: 20px 0;
      }
      .legal-footer {
        font-size: 10px;
        margin-top: 30px;
        padding-top: 15px;
      }
      .company-footer {
        padding: 12px;
      }
    }
    
    @media screen and (max-width: 480px) {
      body {
        padding: 10px;
      }
      .company-name {
        font-size: 18px;
      }
      .invoice-title {
        font-size: 18px;
      }
      .section-title {
        font-size: 15px;
      }
      .amount-breakdown {
        padding: 12px;
      }
      .amount-row.total {
        font-size: 15px;
      }
    }
    
    @media print {
      body {
        padding: 0;
      }
      .invoice-container {
        max-width: 100%;
      }
      .details-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        <div class="company-name">Waadi Solutions Pvt. Ltd.</div>
        <div class="company-tagline">India's Biggest B2B Taxi Marketplace</div>
      </div>
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-meta">
        <div class="invoice-meta-item">
          <div class="invoice-meta-label">Invoice Number</div>
          <div class="invoice-meta-value">${booking.bookingId || booking._id || 'N/A'}</div>
        </div>
        <div class="invoice-meta-item">
          <div class="invoice-meta-label">Invoice Date</div>
          <div class="invoice-meta-value">${formatDate(booking.createdAt)}</div>
        </div>
        <div class="invoice-meta-item">
          <div class="invoice-meta-label">Status</div>
          <div class="invoice-meta-value">${(booking.status || 'N/A').toUpperCase()}</div>
        </div>
      </div>
    </div>

    <!-- Booking Details -->
    <div class="section">
      <div class="section-title">Booking Details</div>
      <div class="details-grid">
        <div class="detail-item">
          <div class="detail-label">Booking ID</div>
          <div class="detail-value">${booking.bookingId}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Transaction ID</div>
          <div class="detail-value">${booking.payment_details?.transaction_id || 'N/A'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Vehicle Number</div>
          <div class="detail-value">${booking.vehicle_number || 'N/A'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Seat Capacity</div>
          <div class="detail-value">${booking.seat_capacity || 'N/A'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Visiting State</div>
          <div class="detail-value">${booking.visiting_state?.name || 'N/A'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Entry Border</div>
          <div class="detail-value">${booking.entry_border || 'N/A'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Tax Mode</div>
          <div class="detail-value">${booking.tax_mode || 'N/A'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Tax Period</div>
          <div class="detail-value">${formatDate(booking.tax_from_date)} - ${formatDate(booking.tax_upto_date)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Valid From</div>
          <div class="detail-value">${formatDate(booking.validity?.valid_from)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Valid Until</div>
          <div class="detail-value">${formatDate(booking.validity?.valid_until)}</div>
        </div>
      </div>
    </div>

    <!-- Customer Information -->
    <div class="section">
      <div class="section-title">Customer Information</div>
      <div class="details-grid">
        <div class="detail-item">
          <div class="detail-label">Name</div>
          <div class="detail-value">${booking.user?.firstName || ''} ${booking.user?.lastName || ''}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Phone Number</div>
          <div class="detail-value">${booking.user?.phoneNumber || 'N/A'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">WhatsApp Number</div>
          <div class="detail-value">${booking.whatsapp_number || 'N/A'}</div>
        </div>
      </div>
    </div>

    <!-- Amount Breakdown -->
    <div class="section">
      <div class="section-title">Amount Breakdown</div>
      <div class="amount-breakdown">
        <div class="amount-row">
          <span>Government Tax</span>
          <span>${formatCurrency(governmentTax)}</span>
        </div>
        <div class="amount-row">
          <span>Processing & Delivery Fee</span>
          <span>${formatCurrency(platformFee)}</span>
        </div>
        <div class="amount-row">
          <span>Payment Gateway Fee</span>
          <span>${formatCurrency(gatewayFee)}</span>
        </div>
        <div class="amount-row total">
          <span>Total Amount</span>
          <span>${formatCurrency(totalAmount)}</span>
        </div>
      </div>
    </div>

    <!-- Declaration -->
    <div class="declaration">
      <div class="declaration-title">Declaration</div>
      <ul class="declaration-list">
        <li>Waadi is an agent and facilitator.</li>
        <li>We do not issue the border tax slip. It is generated by Govt. portal.</li>
        <li>We charge only processing & delivery convenience fee.</li>
        <li>Government fees are paid 100% to the respective authority.</li>
      </ul>
    </div>

    <!-- Company Information -->
    <div class="company-footer">
      <div class="company-footer-title">Company Information</div>
      <div>Waadi Solutions Pvt. Ltd.</div>
    </div>

    <!-- Legal Footer -->
    <div class="legal-footer">
      "This invoice includes facilitation charges only. Government tax amounts shown are remitted to the respective Government authority.
      <br>
      Waadi acts as a booking intermediary and is not responsible for Government system downtime or policy decisions."
    </div>
  </div>
</body>
</html>
  `

  return invoiceHTML
}

/**
 * Opens invoice in a new window for printing/downloading as PDF
 */
export const downloadInvoice = (booking: BookingDetail): void => {
  try {
    console.log('🔨 Generating invoice HTML for booking:', booking.bookingId || booking._id)
    
    if (!booking) {
      throw new Error('Booking data is required to generate invoice')
    }
    
    const invoiceHTML = generateInvoiceHTML(booking)
    const bookingId = booking.bookingId || booking._id || 'invoice'
    
    console.log('✅ Invoice HTML generated, creating blob...')
    
    // Detect if device is mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768
    
    // Create a blob URL to avoid popup blockers
    const blob = new Blob([invoiceHTML], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    
    console.log('📄 Blob URL created:', url.substring(0, 50) + '...')
    
    // For mobile, don't specify dimensions (let browser handle it)
    // For desktop, use specific dimensions for better UX
    const windowFeatures = isMobile 
      ? 'scrollbars=yes,resizable=yes' 
      : 'width=800,height=600,scrollbars=yes,resizable=yes'
    
    console.log('🪟 Opening window with features:', windowFeatures)
    
    // Try to open in a new window
    const printWindow = window.open(url, '_blank', windowFeatures)
    
    console.log('🪟 Window open result:', printWindow ? 'Success' : 'Failed/Blocked')
    
    // Check if window was blocked - try after a small delay to verify
    let windowBlocked = false
    setTimeout(() => {
      if (!printWindow || printWindow.closed || (printWindow as any).closed === true) {
        windowBlocked = true
      }
    }, 100)

    if (!printWindow || printWindow.closed || typeof printWindow.closed === 'undefined') {
      console.warn('⚠️ Popup blocked, using fallback method')
      windowBlocked = true
      
      // Popup was blocked - use fallback download method
      const link = document.createElement('a')
      link.href = url
      link.download = `Invoice_${bookingId}_${new Date().toISOString().split('T')[0]}.html`
      link.style.display = 'none'
      document.body.appendChild(link)
      
      console.log('💾 Triggering fallback download...')
      link.click()
      
      // Remove link after click
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link)
        }
      }, 100)
      
      // Still try to open the print window if possible
      setTimeout(() => {
        console.log('🔄 Trying fallback window open...')
        try {
          const fallbackWindow = window.open(url, '_blank', windowFeatures)
          if (fallbackWindow && !fallbackWindow.closed) {
            console.log('✅ Fallback window opened')
            fallbackWindow.onload = () => {
              setTimeout(() => {
                try {
                  if (!isMobile) {
                    fallbackWindow.print()
                  }
                } catch (e) {
                  console.error('Print error in fallback:', e)
                }
              }, 500)
            }
          } else {
            console.warn('⚠️ Fallback window also blocked')
            // Show alert to user about popup blocker
            setTimeout(() => {
              alert('Please allow popups for this site to view the invoice, or check your downloads folder for the invoice file.')
            }, 500)
          }
        } catch (e) {
          console.error('Error opening fallback window:', e)
        }
      }, 500)
      
      // Clean up after a delay
      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 2000)
      
      return
    }

    // Window opened successfully - wait for content to load, then trigger print dialog
    let printed = false
    
    const triggerPrint = () => {
      if (!printed && printWindow && !printWindow.closed) {
        try {
          console.log('🖨️ Triggering print dialog...')
          printWindow.focus()
          // Only auto-print on desktop, let mobile users see the invoice first
          if (!isMobile) {
            printWindow.print()
            console.log('✅ Print dialog triggered')
          } else {
            console.log('📱 Mobile device - skipping auto-print')
          }
          printed = true
          
          // Clean up blob URL after printing
          setTimeout(() => {
            URL.revokeObjectURL(url)
            console.log('🧹 Blob URL revoked')
          }, 2000)
        } catch (e) {
          console.error('❌ Print error:', e)
        }
      }
    }
  
    // Try multiple approaches to ensure print dialog opens (desktop only)
    if (!isMobile) {
      printWindow.onload = () => {
        console.log('📄 Window loaded, scheduling print...')
        setTimeout(triggerPrint, 500)
      }

      // Fallback if onload doesn't fire
      setTimeout(() => {
        console.log('⏰ Timeout 1: Attempting print...')
        triggerPrint()
      }, 1000)
      setTimeout(() => {
        console.log('⏰ Timeout 2: Attempting print...')
        triggerPrint()
      }, 2000)
    } else {
      // On mobile, just clean up the URL after a delay
      console.log('📱 Mobile: Setting cleanup timeout')
      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 5000)
    }
  } catch (error) {
    console.error('❌ Invoice generation error:', error)
    throw error
  }
}

