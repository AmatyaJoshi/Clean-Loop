import { Client, Databases, Storage, Account } from 'appwrite';

// Initialize Appwrite Client
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '');

// Initialize Services
export const databases = new Databases(client);
export const storage = new Storage(client);
export const account = new Account(client);

// Email Service using Appwrite Functions or direct SMTP
export class EmailService {
  private static bucketId = process.env.APPWRITE_EMAIL_BUCKET_ID || '';

  // Send order confirmation email
  static async sendOrderConfirmation(data: {
    customerEmail: string;
    customerName: string;
    orderNumber: string;
    orderDetails: {
      items: Array<{ name: string; quantity: number; price: number }>;
      subtotal: number;
      tax: number;
      discount: number;
      total: number;
    };
    pickupDate?: string;
    deliveryDate?: string;
  }) {
    try {
      // Using Appwrite's email functionality (requires Appwrite Function setup)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/functions/${process.env.APPWRITE_EMAIL_FUNCTION_ID}/executions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Appwrite-Project': process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '',
            'X-Appwrite-Key': process.env.APPWRITE_API_KEY || '',
          },
          body: JSON.stringify({
            async: false,
            path: '/send-email',
            method: 'POST',
            body: JSON.stringify({
              type: 'order_confirmation',
              to: data.customerEmail,
              data: {
                customerName: data.customerName,
                orderNumber: data.orderNumber,
                orderDetails: data.orderDetails,
                pickupDate: data.pickupDate,
                deliveryDate: data.deliveryDate,
              },
            }),
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      return { success: true };
    } catch (error) {
      console.error('Email send error:', error);
      return { success: false, error };
    }
  }

  // Send payment verification email
  static async sendPaymentVerified(data: {
    customerEmail: string;
    customerName: string;
    orderNumber: string;
    amount: number;
    paymentMethod: string;
  }) {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/functions/${process.env.APPWRITE_EMAIL_FUNCTION_ID}/executions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Appwrite-Project': process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '',
            'X-Appwrite-Key': process.env.APPWRITE_API_KEY || '',
          },
          body: JSON.stringify({
            async: false,
            path: '/send-email',
            method: 'POST',
            body: JSON.stringify({
              type: 'payment_verified',
              to: data.customerEmail,
              data: {
                customerName: data.customerName,
                orderNumber: data.orderNumber,
                amount: data.amount,
                paymentMethod: data.paymentMethod,
              },
            }),
          }),
        }
      );

      return { success: response.ok };
    } catch (error) {
      console.error('Email send error:', error);
      return { success: false, error };
    }
  }

  // Send membership confirmation email
  static async sendMembershipConfirmation(data: {
    customerEmail: string;
    customerName: string;
    planName: string;
    billingCycle: 'monthly' | 'yearly';
    amount: number;
    startDate: string;
    expiryDate: string;
    features: string[];
  }) {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/functions/${process.env.APPWRITE_EMAIL_FUNCTION_ID}/executions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Appwrite-Project': process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '',
            'X-Appwrite-Key': process.env.APPWRITE_API_KEY || '',
          },
          body: JSON.stringify({
            async: false,
            path: '/send-email',
            method: 'POST',
            body: JSON.stringify({
              type: 'membership_confirmation',
              to: data.customerEmail,
              data: {
                customerName: data.customerName,
                planName: data.planName,
                billingCycle: data.billingCycle,
                amount: data.amount,
                startDate: data.startDate,
                expiryDate: data.expiryDate,
                features: data.features,
              },
            }),
          }),
        }
      );

      return { success: response.ok };
    } catch (error) {
      console.error('Email send error:', error);
      return { success: false, error };
    }
  }

  // Send membership expiry reminder
  static async sendMembershipExpiryReminder(data: {
    customerEmail: string;
    customerName: string;
    planName: string;
    expiryDate: string;
    daysRemaining: number;
  }) {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/functions/${process.env.APPWRITE_EMAIL_FUNCTION_ID}/executions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Appwrite-Project': process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '',
            'X-Appwrite-Key': process.env.APPWRITE_API_KEY || '',
          },
          body: JSON.stringify({
            async: false,
            path: '/send-email',
            method: 'POST',
            body: JSON.stringify({
              type: 'membership_expiry_reminder',
              to: data.customerEmail,
              data: {
                customerName: data.customerName,
                planName: data.planName,
                expiryDate: data.expiryDate,
                daysRemaining: data.daysRemaining,
              },
            }),
          }),
        }
      );

      return { success: response.ok };
    } catch (error) {
      console.error('Email send error:', error);
      return { success: false, error };
    }
  }
}

// File Upload Service for payment proofs
export class FileUploadService {
  private static bucketId = process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID || '';

  // Upload payment proof (UPI screenshot)
  static async uploadPaymentProof(file: File, paymentId: string): Promise<{
    success: boolean;
    fileId?: string;
    fileUrl?: string;
    error?: any;
  }> {
    try {
      const fileId = `payment_${paymentId}_${Date.now()}`;
      
      const response = await storage.createFile(
        this.bucketId,
        fileId,
        file
      );

      // Get file URL
      const fileUrl = storage.getFileView(this.bucketId, response.$id);

      return {
        success: true,
        fileId: response.$id,
        fileUrl: fileUrl.toString(),
      };
    } catch (error) {
      console.error('File upload error:', error);
      return { success: false, error };
    }
  }

  // Upload multiple payment proofs
  static async uploadMultipleProofs(
    files: File[],
    paymentId: string
  ): Promise<{
    success: boolean;
    uploads?: Array<{ fileId: string; fileUrl: string; fileName: string }>;
    error?: any;
  }> {
    try {
      const uploads = await Promise.all(
        files.map(async (file) => {
          const result = await this.uploadPaymentProof(file, paymentId);
          if (result.success && result.fileId && result.fileUrl) {
            return {
              fileId: result.fileId,
              fileUrl: result.fileUrl,
              fileName: file.name,
            };
          }
          throw new Error('Upload failed');
        })
      );

      return { success: true, uploads };
    } catch (error) {
      console.error('Multiple file upload error:', error);
      return { success: false, error };
    }
  }

  // Delete payment proof
  static async deletePaymentProof(fileId: string): Promise<{
    success: boolean;
    error?: any;
  }> {
    try {
      await storage.deleteFile(this.bucketId, fileId);
      return { success: true };
    } catch (error) {
      console.error('File delete error:', error);
      return { success: false, error };
    }
  }

  // Get file preview URL
  static getFilePreviewUrl(fileId: string, width?: number, height?: number): string {
    const preview = storage.getFilePreview(
      this.bucketId,
      fileId,
      width,
      height
    );
    return preview.toString();
  }

  // Get file download URL
  static getFileDownloadUrl(fileId: string): string {
    const download = storage.getFileDownload(this.bucketId, fileId);
    return download.toString();
  }
}

export { client };
