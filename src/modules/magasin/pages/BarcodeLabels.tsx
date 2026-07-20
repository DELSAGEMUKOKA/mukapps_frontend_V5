// src/pages/BarcodeLabels.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Barcode, Download, Printer, Settings, Info, TriangleAlert as AlertTriangle, RefreshCw, Plus, Trash2, Save, FileText, Grid2x2 as Grid, List, ChevronDown, ChevronUp, Copy, CircleCheck as CheckCircle, Circle as XCircle, Tag, DollarSign, Globe } from 'lucide-react';
import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import Card from '@/shared/ui/Card';
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import { toPng } from 'html-to-image';

// Currency types
type Currency = 'EUR' | 'USD' | 'CDF';

// Currency configuration
const currencies = {
  EUR: { symbol: '€', code: 'EUR', locale: 'fr-FR', rate: 1, position: 'after' as const },
  USD: { symbol: '$', code: 'USD', locale: 'en-US', rate: 1.09, position: 'before' as const },
  CDF: { symbol: 'FC', code: 'CDF', locale: 'fr-CD', rate: 2850, position: 'after' as const }
};

// Schema for single barcode form with product info
const singleBarcodeSchema = z.object({
  barcode: z.string().min(1, 'Le code-barres est requis'),
  quantity: z.number().int().min(1, 'Minimum 1 étiquette').max(1000, 'Maximum 1000 étiquettes'),
  productName: z.string().optional(),
  price: z.string().optional(),
  currency: z.enum(['EUR', 'USD', 'CDF']),
  barcodeType: z.enum(['CODE128', 'EAN13', 'UPC', 'CODE39']),
  width: z.number().min(1, 'Largeur minimale 1').max(5, 'Largeur maximale 5'),
  height: z.number().min(30, 'Hauteur minimale 30').max(100, 'Hauteur maximale 100'),
  fontSize: z.number().min(6, 'Taille de police minimale 6').max(20, 'Taille de police maximale 20'),
  displayValue: z.boolean(),
  showProductInfo: z.boolean(),
});

// Schema for multiple barcodes
const multipleBarcodesSchema = z.object({
  quantity: z.number().int().min(1, 'Minimum 1 étiquette').max(1000, 'Maximum 1 000 étiquettes'),
  prefix: z.string().optional(),
  startNumber: z.number().int().min(1, 'Doit être un nombre positif').optional(),
  barcodeType: z.enum(['CODE128', 'EAN13', 'UPC', 'CODE39']),
  width: z.number().min(1, 'Largeur minimale 1').max(5, 'Largeur maximale 5'),
  height: z.number().min(30, 'Hauteur minimale 30').max(100, 'Hauteur maximale 100'),
  fontSize: z.number().min(6, 'Taille de police minimale 6').max(20, 'Taille de police maximale 20'),
  displayValue: z.boolean(),
});

type SingleBarcodeFormValues = z.infer<typeof singleBarcodeSchema>;
type MultipleBarcodesFormValues = z.infer<typeof multipleBarcodesSchema>;

// Layout configuration - MODIFIED for 4 labels per row
const layoutSchema = z.object({
  labelsPerRow: z.number().int().min(1, 'Minimum 1').max(6, 'Maximum 6'),
  labelsPerColumn: z.number().int().min(1, 'Minimum 1 ligne').max(12, 'Maximum 12 lignes'),
  orientation: z.enum(['portrait', 'landscape']),
  paperSize: z.enum(['a4', 'a5', 'letter']),
  margin: z.number().min(5, 'Marge minimale 5mm').max(20, 'Marge maximale 20mm'),
});

type LayoutConfig = z.infer<typeof layoutSchema>;

const BarcodeLabels: React.FC = () => {
  // State management
  const [activeTab, setActiveTab] = useState<'single' | 'multiple'>('single');
  const [generatedBarcodes, setGeneratedBarcodes] = useState<Array<{code: string; productName?: string; price?: string; currency?: Currency}>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<{ [key: string]: boolean }>({});
  
  // Refs
  const barcodeContainerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const singleBarcodeRef = useRef<SVGSVGElement>(null);
  
  // Forms
  const singleForm = useForm<SingleBarcodeFormValues>({
    resolver: zodResolver(singleBarcodeSchema),
    defaultValues: {
      barcode: '',
      quantity: 1,
      productName: '',
      price: '',
      currency: 'EUR',
      barcodeType: 'CODE128',
      width: 2,
      height: 50,
      fontSize: 12,
      displayValue: true,
      showProductInfo: false,
    },
  });
  
  const multipleForm = useForm<MultipleBarcodesFormValues>({
    resolver: zodResolver(multipleBarcodesSchema),
    defaultValues: {
      quantity: 10,
      prefix: '',
      startNumber: 1,
      barcodeType: 'CODE128',
      width: 2,
      height: 50,
      fontSize: 12,
      displayValue: true,
    },
  });
  
  // MODIFIED: Default layout with 4 labels per row and 9 rows (36 labels per page)
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>({
    labelsPerRow: 4,      // 4 étiquettes par ligne
    labelsPerColumn: 9,   // 9 lignes par page
    orientation: 'portrait',
    paperSize: 'a4',
    margin: 10,
  });
  
  // Watch values for live preview
  const singleWatch = singleForm.watch();
  const multipleWatch = multipleForm.watch();
  const activeBarcodeType = activeTab === 'single' ? singleWatch.barcodeType : multipleWatch.barcodeType;
  const activeWidth = activeTab === 'single' ? singleWatch.width : multipleWatch.width;
  const activeHeight = activeTab === 'single' ? singleWatch.height : multipleWatch.height;
  const activeFontSize = activeTab === 'single' ? singleWatch.fontSize : multipleWatch.fontSize;
  const activeDisplayValue = activeTab === 'single' ? singleWatch.displayValue : multipleWatch.displayValue;
  
  // Helper: Parse price to number
  const parsePrice = useCallback((price: string): number | null => {
    if (!price) return null;
    let cleaned = price.replace(/[^\d.,]/g, '');
    cleaned = cleaned.replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }, []);
  
  // Helper: Format price with currency for display
  const formatPrice = useCallback((price: string, currency: Currency = 'EUR'): string => {
    const num = parsePrice(price);
    if (num === null) return price;
    
    const currencyConfig = currencies[currency];
    const formattedNumber = new Intl.NumberFormat(currencyConfig.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
    
    if (currencyConfig.position === 'before') {
      return `${currencyConfig.symbol}${formattedNumber}`;
    } else {
      return `${formattedNumber} ${currencyConfig.symbol}`;
    }
  }, [parsePrice]);
  
  // Helper: Format price as plain text for PDF (to avoid encoding issues)
  const formatPriceForPDF = useCallback((price: string, currency: Currency = 'EUR'): string => {
    const num = parsePrice(price);
    if (num === null) return price;
    
    const currencyConfig = currencies[currency];
    const formattedNumber = num.toFixed(2).replace('.', ',');
    
    if (currencyConfig.position === 'before') {
      return `${currencyConfig.symbol} ${formattedNumber}`;
    } else {
      return `${formattedNumber} ${currencyConfig.symbol}`;
    }
  }, [parsePrice]);
  
  // Helper: Calculate EAN-13 check digit
  const calculateEAN13CheckDigit = useCallback((code: string): string => {
    if (code.length !== 12) return '';
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(code[i]);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit.toString();
  }, []);
  
  // Helper: Generate EAN-13 code
  const generateEAN13Code = useCallback((): string => {
    let ean = '';
    for (let i = 0; i < 12; i++) {
      ean += Math.floor(Math.random() * 10).toString();
    }
    return ean + calculateEAN13CheckDigit(ean);
  }, [calculateEAN13CheckDigit]);
  
  // Helper: Validate barcode
  const validateBarcode = useCallback((code: string, type: string): boolean => {
    if (!code) return false;
    
    switch (type) {
      case 'EAN13':
        if (code.length !== 13) return false;
        const checkDigit = calculateEAN13CheckDigit(code.slice(0, 12));
        return checkDigit === code[12];
      case 'UPC':
        return code.length === 12 || code.length === 8;
      case 'CODE128':
      case 'CODE39':
        return code.length > 0 && code.length <= 50;
      default:
        return true;
    }
  }, [calculateEAN13CheckDigit]);
  
  // Generate single barcode preview with product info
  useEffect(() => {
    if (singleBarcodeRef.current && singleWatch.barcode) {
      try {
        let barcodeValue = singleWatch.barcode;
        
        if (singleWatch.barcodeType === 'EAN13' && barcodeValue.length === 12) {
          barcodeValue += calculateEAN13CheckDigit(barcodeValue);
        } else if (singleWatch.barcodeType === 'UPC' && barcodeValue.length !== 12) {
          barcodeValue = barcodeValue.padEnd(12, '0').slice(0, 12);
        }
        
        JsBarcode(singleBarcodeRef.current, barcodeValue, {
          format: singleWatch.barcodeType,
          width: singleWatch.width,
          height: singleWatch.height,
          displayValue: singleWatch.displayValue,
          fontSize: singleWatch.fontSize,
          margin: 5,
          textMargin: 2,
        });
        
        const isValid = validateBarcode(barcodeValue, singleWatch.barcodeType);
        setValidationStatus(prev => ({ ...prev, [barcodeValue]: isValid }));
      } catch (error) {
        console.error('Error generating barcode preview:', error);
        setValidationStatus(prev => ({ ...prev, [singleWatch.barcode]: false }));
      }
    }
  }, [singleWatch.barcode, singleWatch.barcodeType, singleWatch.width, singleWatch.height, singleWatch.displayValue, singleWatch.fontSize, calculateEAN13CheckDigit, validateBarcode]);
  
  // Generate multiple barcodes
  const generateMultipleBarcodes = useCallback(async (data: MultipleBarcodesFormValues) => {
    setIsGenerating(true);
    
    try {
      const { quantity, prefix, startNumber, barcodeType } = data;
      const newBarcodes: Array<{code: string; productName?: string; price?: string; currency?: Currency}> = [];
      
      const chunkSize = 100;
      for (let i = 0; i < quantity; i += chunkSize) {
        const chunk = Math.min(chunkSize, quantity - i);
        for (let j = 0; j < chunk; j++) {
          let code: string;
          const index = i + j;
          
          if (prefix && startNumber !== undefined) {
            code = `${prefix}${startNumber + index}`;
          } else if (prefix) {
            code = `${prefix}${index + 1}`;
          } else if (barcodeType === 'EAN13') {
            code = generateEAN13Code();
          } else {
            code = Math.random().toString(36).substring(2, 10).toUpperCase();
          }
          
          newBarcodes.push({ code });
        }
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      setGeneratedBarcodes(newBarcodes);
    } catch (error) {
      console.error('Error generating barcodes:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [generateEAN13Code]);
  
  // MODIFIED: Generate PDF for single barcode with fixed 4x9 grid (36 labels per page)
  const generateSinglePDF = useCallback(async (data: SingleBarcodeFormValues) => {
    setIsExporting(true);
    
    try {
      const { barcode, quantity, productName, price, currency, barcodeType, width, height, fontSize, displayValue, showProductInfo } = data;
      const { orientation, paperSize, margin, labelsPerRow, labelsPerColumn } = layoutConfig;
      
      // Get paper dimensions
      const paperDimensions: { [key: string]: { width: number; height: number } } = {
        a4: { width: 210, height: 297 },
        a5: { width: 148, height: 210 },
        letter: { width: 216, height: 279 },
      };
      
      const pageWidth = paperDimensions[paperSize].width;
      const pageHeight = paperDimensions[paperSize].height;
      const pageOrientation = orientation === 'landscape' ? 'landscape' : 'portrait';
      
      const doc = new jsPDF({
        orientation: pageOrientation,
        unit: 'mm',
        format: paperSize,
      });
      
      const availableWidth = pageWidth - (2 * margin);
      const availableHeight = pageHeight - (2 * margin);
      
      // Calculate label dimensions based on fixed grid
      const labelWidth = availableWidth / labelsPerRow;
      const labelHeight = availableHeight / labelsPerColumn;
      
      // Labels per page = rows × columns
      const labelsPerPage = labelsPerRow * labelsPerColumn;
      
      // Create barcode image once
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      document.body.appendChild(tempContainer);
      
      const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      tempContainer.appendChild(svgElement);
      
      let barcodeValue = barcode;
      if (barcodeType === 'EAN13' && barcodeValue.length === 12) {
        barcodeValue += calculateEAN13CheckDigit(barcodeValue);
      }
      
      JsBarcode(svgElement, barcodeValue, {
        format: barcodeType,
        width,
        height,
        displayValue,
        fontSize,
        margin: 5,
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const imgData = await toPng(svgElement, { quality: 1, pixelRatio: 2 });
      
      let currentPage = 0;
      for (let i = 0; i < quantity; i++) {
        const pageIndex = Math.floor(i / labelsPerPage);
        const positionOnPage = i % labelsPerPage;
        const row = Math.floor(positionOnPage / labelsPerRow);
        const col = positionOnPage % labelsPerRow;
        
        if (pageIndex > currentPage) {
          doc.addPage();
          currentPage = pageIndex;
        }
        
        const x = margin + (col * labelWidth);
        const y = margin + (row * labelHeight);
        
        // Add barcode - scale to fit label
        const barcodeWidth = labelWidth * 0.85;
        const barcodeHeight = showProductInfo ? labelHeight * 0.7 : labelHeight * 0.85;
        doc.addImage(imgData, 'PNG', x + (labelWidth - barcodeWidth) / 2, y, barcodeWidth, barcodeHeight);
        
        // Add product info if enabled
        if (showProductInfo && (productName || price)) {
          const infoY = y + barcodeHeight + 2;
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(0, 0, 0);
          
          if (productName) {
            const safeProductName = productName.normalize('NFKD').replace(/[^\x00-\x7F]/g, '');
            const maxChars = Math.floor(labelWidth / 1.5);
            const truncatedName = safeProductName.length > maxChars ? safeProductName.substring(0, maxChars - 3) + '...' : safeProductName;
            doc.text(truncatedName || productName, x + 2, infoY);
          }
          
          if (price) {
            const formattedPrice = formatPriceForPDF(price, currency);
            const safePrice = formattedPrice.normalize('NFKD').replace(/[^\x00-\x7F]/g, '');
            doc.text(safePrice || formattedPrice, x + 2, infoY + 4);
          }
        }
      }
      
      doc.save(`etiquettes-${barcode}.pdf`);
      document.body.removeChild(tempContainer);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsExporting(false);
    }
  }, [layoutConfig, calculateEAN13CheckDigit, formatPriceForPDF]);
  
  // MODIFIED: Generate PDF for multiple barcodes with fixed 4x9 grid (36 labels per page)
  const generateMultiplePDF = useCallback(async () => {
    if (generatedBarcodes.length === 0) return;
    
    setIsExporting(true);
    
    try {
      const { orientation, paperSize, margin, labelsPerRow, labelsPerColumn } = layoutConfig;
      const { barcodeType, width, height, fontSize, displayValue } = multipleWatch;
      
      const paperDimensions: { [key: string]: { width: number; height: number } } = {
        a4: { width: 210, height: 297 },
        a5: { width: 148, height: 210 },
        letter: { width: 216, height: 279 },
      };
      
      const pageWidth = paperDimensions[paperSize].width;
      const pageHeight = paperDimensions[paperSize].height;
      const pageOrientation = orientation === 'landscape' ? 'landscape' : 'portrait';
      
      const doc = new jsPDF({
        orientation: pageOrientation,
        unit: 'mm',
        format: paperSize,
      });
      
      const availableWidth = pageWidth - (2 * margin);
      const availableHeight = pageHeight - (2 * margin);
      
      // Calculate label dimensions based on fixed grid
      const labelWidth = availableWidth / labelsPerRow;
      const labelHeight = availableHeight / labelsPerColumn;
      
      // Labels per page = rows × columns
      const labelsPerPage = labelsPerRow * labelsPerColumn;
      
      let currentPage = 0;
      
      for (let i = 0; i < generatedBarcodes.length; i++) {
        const pageIndex = Math.floor(i / labelsPerPage);
        const positionOnPage = i % labelsPerPage;
        const row = Math.floor(positionOnPage / labelsPerRow);
        const col = positionOnPage % labelsPerRow;
        
        if (pageIndex > currentPage) {
          doc.addPage();
          currentPage = pageIndex;
        }
        
        const x = margin + (col * labelWidth);
        const y = margin + (row * labelHeight);
        
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        document.body.appendChild(tempContainer);
        
        const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        tempContainer.appendChild(svgElement);
        
        let barcodeValue = generatedBarcodes[i].code;
        if (barcodeType === 'EAN13' && barcodeValue.length === 12) {
          barcodeValue += calculateEAN13CheckDigit(barcodeValue);
        }
        
        JsBarcode(svgElement, barcodeValue, {
          format: barcodeType,
          width,
          height,
          displayValue,
          fontSize,
           font: 'monospace',
          margin: 5,
        });
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const imgData = await toPng(svgElement, { quality: 1, pixelRatio: 2 });
        const barcodeWidth = labelWidth * 0.85;
        const barcodeHeight = labelHeight * 0.85;
        doc.addImage(imgData, 'PNG', x + (labelWidth - barcodeWidth) / 2, y + (labelHeight - barcodeHeight) / 2, barcodeWidth, barcodeHeight);
        
        document.body.removeChild(tempContainer);
      }
      
      doc.save('etiquettes-multiples.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsExporting(false);
    }
  }, [generatedBarcodes, layoutConfig, multipleWatch, calculateEAN13CheckDigit]);
  
  // Copy to clipboard
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);
  
  // Print barcodes
  const printBarcodes = useCallback(() => {
    if (!previewRef.current || (activeTab === 'multiple' && generatedBarcodes.length === 0)) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Veuillez autoriser les popups pour imprimer les étiquettes.');
      return;
    }
    
    let html = '';
    if (activeTab === 'single') {
      const showProductInfo = singleWatch.showProductInfo;
      const productName = singleWatch.productName;
      const price = singleWatch.price;
      const currency = singleWatch.currency;
      const formattedPrice = price ? formatPrice(price, currency) : '';
      
      html = `
        <div class="barcode-item">
          ${singleBarcodeRef.current?.outerHTML || ''}
          ${showProductInfo && (productName || price) ? `
            <div class="product-info">
              ${productName ? `<div class="product-name">${productName}</div>` : ''}
              ${price ? `<div class="product-price">${formattedPrice}</div>` : ''}
            </div>
          ` : ''}
        </div>
      `;
    } else {
      html = previewRef.current.innerHTML;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Impression des codes-barres</title>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
            }
            .barcode-grid {
              display: grid;
              grid-template-columns: repeat(${layoutConfig.labelsPerRow}, 1fr);
              gap: 10px;
              margin: 0 auto;
            }
            .barcode-item {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              break-inside: avoid;
              padding: 10px;
            }
            .product-info {
              text-align: center;
              margin-top: 8px;
              font-size: 12px;
            }
            .product-name {
              font-weight: bold;
              margin-bottom: 4px;
            }
            .product-price {
              color: #2c3e50;
              font-weight: 600;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              @page {
                size: ${layoutConfig.orientation === 'landscape' ? 'landscape' : 'portrait'};
                margin: ${layoutConfig.margin}mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="barcode-grid">
            ${html}
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                setTimeout(() => window.close(), 500);
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  }, [activeTab, generatedBarcodes, layoutConfig, singleWatch, formatPrice]);
  
  // Clear generated barcodes
  const clearBarcodes = useCallback(() => {
    if (window.confirm('Voulez-vous vraiment effacer tous les codes-barres générés ?')) {
      setGeneratedBarcodes([]);
    }
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Barcode className="h-8 w-8 text-blue-600" />
            Générateur d'étiquettes à codes-barres
          </h1>
          <p className="mt-2 text-gray-600">
            Créez des étiquettes professionnelles avec codes-barres pour vos produits
          </p>
          <div className="mt-2 text-sm text-blue-600 bg-blue-50 p-2 rounded inline-block">
            📄 Configuration optimisée : {layoutConfig.labelsPerRow} × {layoutConfig.labelsPerColumn} = {layoutConfig.labelsPerRow * layoutConfig.labelsPerColumn} étiquettes par page
          </div>
        </div>
        
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('single')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'single'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText size={16} />
                Code unique
              </div>
            </button>
            <button
              onClick={() => setActiveTab('multiple')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'multiple'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Grid size={16} />
                Génération multiple
              </div>
            </button>
          </nav>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Form */}
            <Card>
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Configuration
                </h2>
                
                {activeTab === 'single' ? (
                  <form onSubmit={singleForm.handleSubmit(generateSinglePDF)} className="space-y-4">
                    <Input
                      label="Code-barres *"
                      placeholder="Entrez le code-barres"
                      error={singleForm.formState.errors.barcode?.message}
                      {...singleForm.register('barcode')}
                    />
                    
                    <Input
                      label="Nombre d'étiquettes"
                      type="number"
                      min={1}
                      max={1000}
                      error={singleForm.formState.errors.quantity?.message}
                      {...singleForm.register('quantity', { valueAsNumber: true })}
                    />
                    
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      {showAdvanced ? 'Masquer les options avancées' : 'Afficher les options avancées'}
                    </button>
                    
                    {showAdvanced && (
                      <div className="space-y-4 pt-2 border-t border-gray-200">
                        {/* Product Information Section */}
                        <div className="space-y-3 pb-3 border-b border-gray-200">
                          <h4 className="text-md font-medium text-gray-800 flex items-center gap-2">
                            <Tag size={16} />
                            Informations produit (optionnel)
                          </h4>
                          
                          <Input
                            label="Nom du produit"
                            placeholder="Ex: Smartphone XYZ"
                            {...singleForm.register('productName')}
                          />
                          
                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              label="Prix"
                              placeholder="Ex: 299,99"
                              {...singleForm.register('price')}
                            />
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Devise
                              </label>
                              <div className="flex gap-2">
                                <select
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                  {...singleForm.register('currency')}
                                >
                                  <option value="EUR">EUR (€)</option>
                                  <option value="USD">USD ($)</option>
                                  <option value="CDF">CDF (FC)</option>
                                </select>
                                <div className="flex items-center text-gray-500">
                                  <Globe size={18} />
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-2">
                            <input
                              type="checkbox"
                              id="showProductInfo"
                              className="h-4 w-4 text-blue-600 rounded"
                              {...singleForm.register('showProductInfo')}
                            />
                            <label htmlFor="showProductInfo" className="text-sm text-gray-700">
                              Afficher les informations produit sur l'étiquette
                            </label>
                          </div>
                        </div>
                        
                        {/* Barcode Settings */}
                        <div className="space-y-3">
                          <h4 className="text-md font-medium text-gray-800">
                            Paramètres du code-barres
                          </h4>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Type de code-barres
                            </label>
                            <select
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              {...singleForm.register('barcodeType')}
                            >
                              <option value="CODE128">Code 128</option>
                              <option value="EAN13">EAN-13</option>
                              <option value="UPC">UPC</option>
                              <option value="CODE39">Code 39</option>
                            </select>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              label="Largeur"
                              type="number"
                              step={0.5}
                              {...singleForm.register('width', { valueAsNumber: true })}
                            />
                            <Input
                              label="Hauteur"
                              type="number"
                              {...singleForm.register('height', { valueAsNumber: true })}
                            />
                          </div>
                          
                          <Input
                            label="Taille de police"
                            type="number"
                            min={6}
                            max={20}
                            {...singleForm.register('fontSize', { valueAsNumber: true })}
                          />
                          
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="displayValue"
                              className="h-4 w-4 text-blue-600 rounded"
                              {...singleForm.register('displayValue')}
                            />
                            <label htmlFor="displayValue" className="text-sm text-gray-700">
                              Afficher la valeur du code
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <Button
                      type="submit"
                      variant="primary"
                      fullWidth
                      isLoading={isExporting}
                      leftIcon={<Download size={16} />}
                    >
                      Générer et télécharger PDF
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={multipleForm.handleSubmit(generateMultipleBarcodes)} className="space-y-4">
                    <Input
                      label="Nombre d'étiquettes"
                      type="number"
                      min={1}
                      max={1000}
                      error={multipleForm.formState.errors.quantity?.message}
                      {...multipleForm.register('quantity', { valueAsNumber: true })}
                    />
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Préfixe"
                        placeholder="Ex: PROD-"
                        {...multipleForm.register('prefix')}
                      />
                      <Input
                        label="Numéro de départ"
                        type="number"
                        min={1}
                        {...multipleForm.register('startNumber', { valueAsNumber: true })}
                      />
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      {showAdvanced ? 'Masquer les options avancées' : 'Afficher les options avancées'}
                    </button>
                    
                    {showAdvanced && (
                      <div className="space-y-4 pt-2 border-t border-gray-200">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Type de code-barres
                          </label>
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            {...multipleForm.register('barcodeType')}
                          >
                            <option value="CODE128">Code 128</option>
                            <option value="EAN13">EAN-13</option>
                            <option value="UPC">UPC</option>
                            <option value="CODE39">Code 39</option>
                          </select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            label="Largeur"
                            type="number"
                            step={0.5}
                            {...multipleForm.register('width', { valueAsNumber: true })}
                          />
                          <Input
                            label="Hauteur"
                            type="number"
                            {...multipleForm.register('height', { valueAsNumber: true })}
                          />
                        </div>
                        
                        <Input
                          label="Taille de police"
                          type="number"
                          min={6}
                          max={20}
                          {...multipleForm.register('fontSize', { valueAsNumber: true })}
                        />
                        
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="displayValueMulti"
                            className="h-4 w-4 text-blue-600 rounded"
                            {...multipleForm.register('displayValue')}
                          />
                          <label htmlFor="displayValueMulti" className="text-sm text-gray-700">
                            Afficher la valeur
                          </label>
                        </div>
                      </div>
                    )}
                    
                    <Button
                      type="submit"
                      variant="primary"
                      fullWidth
                      isLoading={isGenerating}
                      leftIcon={<RefreshCw size={16} />}
                    >
                      Générer les codes-barres
                    </Button>
                  </form>
                )}
              </div>
            </Card>
            
            {/* Layout Configuration - MODIFIED */}
            <Card>
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                  <Settings size={18} />
                  Configuration de la mise en page
                </h3>
                
                <div className="bg-blue-50 p-3 rounded-md mb-2">
                  <div className="text-sm font-medium text-blue-800">
                    Format optimisé : 4 × 9 = 36 étiquettes par page
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    Dimensions calculées automatiquement pour un rendu parfait
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Étiquettes par ligne : {layoutConfig.labelsPerRow}
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={6}
                    value={layoutConfig.labelsPerRow}
                    onChange={(e) => setLayoutConfig(prev => ({ 
                      ...prev, 
                      labelsPerRow: parseInt(e.target.value) 
                    }))}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Recommandé : 4 étiquettes par ligne
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lignes par page : {layoutConfig.labelsPerColumn}
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={12}
                    value={layoutConfig.labelsPerColumn}
                    onChange={(e) => setLayoutConfig(prev => ({ 
                      ...prev, 
                      labelsPerColumn: parseInt(e.target.value) 
                    }))}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Recommandé : 9 lignes pour 36 étiquettes par page
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-md text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {layoutConfig.labelsPerRow} × {layoutConfig.labelsPerColumn} = {layoutConfig.labelsPerRow * layoutConfig.labelsPerColumn}
                  </div>
                  <div className="text-xs text-gray-600">
                    étiquettes par page
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Orientation
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="portrait"
                        checked={layoutConfig.orientation === 'portrait'}
                        onChange={() => setLayoutConfig(prev => ({ ...prev, orientation: 'portrait' }))}
                      />
                      <span>Portrait</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="landscape"
                        checked={layoutConfig.orientation === 'landscape'}
                        onChange={() => setLayoutConfig(prev => ({ ...prev, orientation: 'landscape' }))}
                      />
                      <span>Paysage</span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Format papier
                  </label>
                  <select
                    value={layoutConfig.paperSize}
                    onChange={(e) => setLayoutConfig(prev => ({ ...prev, paperSize: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="a4">A4 (210 x 297 mm)</option>
                    <option value="a5">A5 (148 x 210 mm)</option>
                    <option value="letter">Letter (216 x 279 mm)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marge (mm) : {layoutConfig.margin}
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={20}
                    value={layoutConfig.margin}
                    onChange={(e) => setLayoutConfig(prev => ({ ...prev, margin: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                </div>
              </div>
            </Card>
            
            {/* Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-blue-800 mb-1">Conseils d'utilisation</h3>
                  <ul className="text-sm text-blue-700 space-y-1 list-disc pl-4">
                    <li>Configuration optimale : 4 étiquettes par ligne × 9 lignes = 36 étiquettes/page</li>
                    <li>Vérifiez la validité des codes-barres avant impression</li>
                    <li>Testez avec quelques étiquettes avant grande quantité</li>
                    <li>Utilisez du papier autocollant pour les étiquettes produits</li>
                    <li>Vérifiez les marges d'impression dans votre navigateur</li>
                    <li>Pour EAN-13, le code doit faire 12 ou 13 chiffres</li>
                    <li>Devises disponibles : Euro (€), Dollar US ($), Franc Congolais (FC)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          {/* Preview Panel */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'single' ? (
              <Card>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Aperçu de l'étiquette
                    </h3>
                    {validationStatus[singleWatch.barcode] !== undefined && singleWatch.barcode && (
                      <div className="flex items-center gap-2">
                        {validationStatus[singleWatch.barcode] ? (
                          <>
                            <CheckCircle size={16} className="text-green-500" />
                            <span className="text-sm text-green-600">Code valide</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={16} className="text-red-500" />
                            <span className="text-sm text-red-600">Code invalide</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col justify-center items-center min-h-[300px]">
                    <svg ref={singleBarcodeRef} className="max-w-full h-auto"></svg>
                    
                    {singleWatch.showProductInfo && (singleWatch.productName || singleWatch.price) && (
                      <div className="mt-4 text-center">
                        {singleWatch.productName && (
                          <div className="font-semibold text-gray-800">
                            {singleWatch.productName}
                          </div>
                        )}
                        {singleWatch.price && (
                          <div className="text-lg font-bold text-blue-600 mt-1">
                            {formatPrice(singleWatch.price, singleWatch.currency)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {singleWatch.barcode && validationStatus[singleWatch.barcode] === false && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">
                        ⚠️ Le code-barres ne semble pas valide pour le format sélectionné.
                        Vérifiez le format requis.
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Printer size={16} />}
                      onClick={printBarcodes}
                      disabled={!singleWatch.barcode}
                    >
                      Imprimer
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Copy size={16} />}
                      onClick={() => copyToClipboard(singleWatch.barcode)}
                      disabled={!singleWatch.barcode}
                    >
                      {copiedCode === singleWatch.barcode ? 'Copié !' : 'Copier le code'}
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <>
                {generatedBarcodes.length > 0 && (
                  <Card>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Aperçu ({Math.min(20, generatedBarcodes.length)} sur {generatedBarcodes.length} étiquettes)
                        </h3>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Printer size={16} />}
                            onClick={printBarcodes}
                          >
                            Imprimer
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<Download size={16} />}
                            onClick={generateMultiplePDF}
                            isLoading={isExporting}
                          >
                            PDF
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Trash2 size={16} />}
                            onClick={clearBarcodes}
                          >
                            Effacer
                          </Button>
                        </div>
                      </div>
                      
                      <div
                        ref={previewRef}
                        className="border rounded-lg p-4 bg-gray-50"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: `repeat(${layoutConfig.labelsPerRow}, 1fr)`,
                          gap: '0.5rem',
                          maxHeight: '600px',
                          overflowY: 'auto',
                        }}
                      >
                        {generatedBarcodes.slice(0, Math.min(36, generatedBarcodes.length)).map((item, index) => (
                          <div
                            key={`preview-${index}-${item.code}`}
                            className="bg-white border rounded p-2 flex flex-col items-center"
                            style={{ fontSize: '10px' }}
                          >
                            <svg className="barcode" width={activeWidth * 40} height={activeHeight * 0.8}></svg>
                            <button
                              onClick={() => copyToClipboard(item.code)}
                              className="mt-1 text-xs text-blue-600 hover:text-blue-700"
                            >
                              {copiedCode === item.code ? 'Copié !' : 'Copier'}
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      {/* Hidden container for all barcodes */}
                      <div ref={barcodeContainerRef} className="hidden">
                        {generatedBarcodes.map((item, index) => (
                          <svg key={`hidden-${index}-${item.code}`} className="barcode"></svg>
                        ))}
                      </div>
                    </div>
                  </Card>
                )}
                
                {/* Apply barcodes to preview */}
                {generatedBarcodes.length > 0 && previewRef.current && (
                  <BarcodeApplier
                    containerRef={previewRef}
                    barcodes={generatedBarcodes.map(item => item.code).slice(0, 36)}
                    config={{
                      barcodeType: activeBarcodeType,
                      width: activeWidth,
                      height: activeHeight,
                      displayValue: activeDisplayValue,
                      fontSize: activeFontSize,
                    }}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component to apply barcodes to preview
const BarcodeApplier: React.FC<{
  containerRef: React.RefObject<HTMLDivElement>;
  barcodes: string[];
  config: any;
}> = ({ containerRef, barcodes, config }) => {
  useEffect(() => {
    if (containerRef.current) {
      const svgs = containerRef.current.querySelectorAll('svg.barcode');
      svgs.forEach((svg, index) => {
        if (index < barcodes.length) {
          try {
            JsBarcode(svg, barcodes[index], {
              format: config.barcodeType,
              width: config.width,
              height: config.height,
              displayValue: config.displayValue,
              fontSize: config.fontSize,
              margin: 5,
            });
          } catch (error) {
            console.error('Error applying barcode:', error);
          }
        }
      });
    }
  }, [containerRef, barcodes, config]);
  
  return null;
};

export default BarcodeLabels;