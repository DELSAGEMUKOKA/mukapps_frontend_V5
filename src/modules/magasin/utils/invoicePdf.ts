// src/modules/magasin/utils/invoicePdf.ts
import apiClient from '@/core/api/axiosConfig';

export const printInvoicePdf = async (invoiceId: string) => {
  try {
    const response = await apiClient.get(`/magasin/sales/${invoiceId}/invoice`, {
      responseType: 'blob',
    });
    
    const url = URL.createObjectURL(response.data);
    window.open(url, '_blank');
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Erreur lors de l\'impression:', error);
    throw new Error('Impossible de générer la facture PDF');
  }
};

export const downloadInvoicePdf = async (invoiceId: string, filename?: string) => {
  try {
    const response = await apiClient.get(`/magasin/sales/${invoiceId}/invoice`, {
      responseType: 'blob',
    });
    
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `facture_${invoiceId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Erreur lors du téléchargement:', error);
    throw new Error('Impossible de télécharger la facture PDF');
  }
};