```json
{
  "api_documentation": {
    "base_url": "http://localhost:3000/api",
    "version": "2.0.0",
    "description": "Backend API untuk platform Protextify - deteksi plagiarisme dan manajemen tugas akademik",
    "endpoints": {
      "auth": {
        "base_path": "/auth",
        "endpoints": [
          {
            "method": "POST",
            "path": "/auth/register",
            "description": "Mendaftarkan user baru (student/instructor) dan mengirim email verifikasi",
            "authentication": "Not required",
            "request_body": {
              "email": "string",
              "password": "string",
              "fullName": "string",
              "role": "STUDENT | INSTRUCTOR",
              "institution": "string (optional)"
            },
            "success_response": {
              "status_code": 201,
              "body": {
                "message": "Registration successful, verification email sent",
                "user": {
                  "id": "string",
                  "email": "string",
                  "fullName": "string",
                  "role": "string",
                  "institution": "string",
                  "emailVerified": false,
                  "createdAt": "ISO date string",
                  "updatedAt": "ISO date string"
                }
              }
            }
          },
          {
            "method": "POST",
            "path": "/auth/login",
            "description": "Login dengan email dan password, mengembalikan JWT access token",
            "authentication": "Not required",
            "request_body": {
              "email": "string",
              "password": "string"
            },
            "success_response": {
              "status_code": 200,
              "body": {
                "accessToken": "string (JWT token)",
                "user": {
                  "id": "string",
                  "email": "string",
                  "fullName": "string",
                  "role": "string",
                  "institution": "string",
                  "emailVerified": true,
                  "createdAt": "ISO date string",
                  "updatedAt": "ISO date string"
                }
              }
            }
          },
          {
            "method": "POST",
            "path": "/auth/send-verification",
            "description": "Mengirim email verifikasi ke user",
            "authentication": "Not required",
            "request_body": {
              "email": "string"
            },
            "success_response": {
              "status_code": 200,
              "body": {
                "message": "Verification email sent"
              }
            }
          },
          {
            "method": "POST",
            "path": "/auth/verify-email",
            "description": "Verifikasi email menggunakan token",
            "authentication": "Not required",
            "request_body": {
              "token": "string"
            },
            "success_response": {
              "status_code": 200,
              "body": {
                "message": "Email verified successfully"
              }
            }
          },
          {
            "method": "POST",
            "path": "/auth/forgot-password",
            "description": "Request reset password link ke email user",
            "authentication": "Not required",
            "request_body": {
              "email": "string"
            },
            "success_response": {
              "status_code": 200,
              "body": {
                "message": "Reset password link sent to your email"
              }
            }
          },
          {
            "method": "POST",
            "path": "/auth/reset-password",
            "description": "Reset password menggunakan token dari email",
            "authentication": "Not required",
            "request_body": {
              "token": "string",
              "newPassword": "string"
            },
            "success_response": {
              "status_code": 200,
              "body": {
                "message": "Password reset successful"
              }
            }
          },
          {
            "method": "GET",
            "path": "/auth/google",
            "description": "Redirect ke halaman login Google OAuth",
            "authentication": "Not required",
            "success_response": {
              "status_code": 302,
              "description": "Redirect to Google login page"
            }
          },
          {
            "method": "GET",
            "path": "/auth/google/callback",
            "description": "Callback dari Google setelah login berhasil - mendukung redirect dan JSON response",
            "authentication": "Not required",
            "query_parameters": {
              "format": "json (optional) - untuk mendapat JSON response instead of redirect"
            },
            "success_response_redirect": {
              "status_code": 302,
              "description": "Redirect to frontend with JWT token in URL parameter"
            },
            "success_response_json": {
              "status_code": 200,
              "body": {
                "accessToken": "string (JWT token)",
                "user": {
                  "id": "string",
                  "email": "string",
                  "fullName": "string",
                  "role": "string",
                  "institution": "string",
                  "emailVerified": true,
                  "createdAt": "ISO date string",
                  "updatedAt": "ISO date string"
                }
              }
            }
          },
          {
            "method": "GET",
            "path": "/auth/google/user",
            "description": "Mendapat data user setelah Google login berhasil",
            "authentication": "Required (JWT)",
            "success_response": {
              "status_code": 200,
              "body": {
                "accessToken": "string (JWT token)",
                "user": {
                  "id": "string",
                  "email": "string",
                  "fullName": "string",
                  "role": "string",
                  "institution": "string",
                  "emailVerified": true,
                  "createdAt": "ISO date string",
                  "updatedAt": "ISO date string"
                }
              }
            }
          },
          {
            "method": "GET",
            "path": "/auth/instructor-only",
            "description": "Endpoint khusus instructor (contoh role-based access)",
            "authentication": "Required (INSTRUCTOR role)",
            "success_response": {
              "status_code": 200,
              "body": {
                "message": "Only instructor can access this!"
              }
            }
          }
        ]
      },
      "users": {
        "base_path": "/users",
        "endpoints": [
          {
            "method": "GET",
            "path": "/users/me",
            "description": "Mengambil data profil user yang sedang login",
            "authentication": "Required (JWT)",
            "success_response": {
              "status_code": 200,
              "body": {
                "id": "string",
                "email": "string",
                "fullName": "string",
                "institution": "string",
                "role": "string",
                "emailVerified": true,
                "createdAt": "ISO date string",
                "updatedAt": "ISO date string"
              }
            }
          },
          {
            "method": "PATCH",
            "path": "/users/me",
            "description": "Update profil user yang sedang login (fullName, institution)",
            "authentication": "Required (JWT)",
            "request_body": {
              "fullName": "string (optional)",
              "institution": "string (optional)"
            },
            "success_response": {
              "status_code": 200,
              "body": {
                "id": "string",
                "email": "string",
                "fullName": "string",
                "institution": "string",
                "role": "string",
                "emailVerified": true,
                "createdAt": "ISO date string",
                "updatedAt": "ISO date string"
              }
            }
          }
        ]
      },
      "classes": {
        "base_path": "/classes",
        "endpoints": [
          {
            "method": "POST",
            "path": "/classes",
            "description": "Instructor membuat kelas baru dengan token unik",
            "authentication": "Required (INSTRUCTOR role)",
            "request_body": {
              "name": "string",
              "description": "string (optional)"
            },
            "success_response": {
              "status_code": 201,
              "body": {
                "id": "string",
                "name": "string",
                "description": "string",
                "instructorId": "string",
                "classToken": "string (8 characters)",
                "createdAt": "ISO date string"
              }
            }
          },
          {
            "method": "POST",
            "path": "/classes/join",
            "description": "Student bergabung ke kelas menggunakan token",
            "authentication": "Required (STUDENT role)",
            "request_body": {
              "classToken": "string"
            },
            "success_response": {
              "status_code": 200,
              "body": {
                "message": "Successfully joined class",
                "class": {
                  "id": "string",
                  "name": "string",
                  "instructorId": "string",
                  "classToken": "string"
                }
              }
            }
          },
          {
            "method": "GET",
            "path": "/classes",
            "description": "Mendapat daftar kelas (instructor: kelas yang dibuat, student: kelas yang diikuti)",
            "authentication": "Required (JWT)",
            "success_response": {
              "status_code": 200,
              "body": [
                {
                  "id": "string",
                  "name": "string",
                  "instructorId": "string",
                  "classToken": "string"
                }
              ]
            }
          },
          {
            "method": "GET",
            "path": "/classes/:id",
            "description": "Mendapat detail sebuah kelas",
            "authentication": "Required (JWT)",
            "path_parameters": {
              "id": "string (Class ID)"
            },
            "success_response": {
              "status_code": 200,
              "body": {
                "id": "string",
                "name": "string",
                "description": "string",
                "instructor": {
                  "id": "string",
                  "fullName": "string"
                },
                "enrollments": [
                  {
                    "student": {
                      "id": "string",
                      "fullName": "string"
                    }
                  }
                ],
                "assignments": [
                  {
                    "id": "string",
                    "title": "string"
                  }
                ]
              }
            }
          }
        ]
      },
      "assignments": {
        "base_path": "/classes/:classId/assignments",
        "endpoints": [
          {
            "method": "POST",
            "path": "/classes/:classId/assignments",
            "description": "Instructor membuat tugas baru di kelas (memerlukan pembayaran untuk aktivasi)",
            "authentication": "Required (INSTRUCTOR role)",
            "path_parameters": {
              "classId": "string (Class ID)"
            },
            "request_body": {
              "title": "string",
              "instructions": "string",
              "deadline": "ISO date string (optional)",
              "expectedStudentCount": "number"
            },
            "success_response": {
              "status_code": 201,
              "body": {
                "assignment": {
                  "id": "string",
                  "title": "string",
                  "instructions": "string",
                  "deadline": "ISO date string",
                  "classId": "string",
                  "expectedStudentCount": "number",
                  "active": false
                },
                "paymentRequired": true,
                "totalPrice": "number",
                "pricePerStudent": 2500,
                "expectedStudentCount": "number",
                "message": "Assignment created. Please complete payment to activate.",
                "paymentData": {
                  "amount": "number",
                  "assignmentId": "string"
                }
              }
            }
          },
          {
            "method": "GET",
            "path": "/classes/:classId/assignments",
            "description": "Mendapat daftar tugas di kelas (student hanya melihat yang aktif)",
            "authentication": "Required (JWT)",
            "path_parameters": {
              "classId": "string (Class ID)"
            },
            "success_response": {
              "status_code": 200,
              "body": [
                {
                  "id": "string",
                  "title": "string",
                  "instructions": "string",
                  "deadline": "ISO date string",
                  "classId": "string",
                  "expectedStudentCount": "number",
                  "active": true,
                  "submissions": [],
                  "_count": {
                    "submissions": "number"
                  }
                }
              ]
            }
          }
        ]
      },
      "submissions": {
        "base_path": "/submissions",
        "endpoints": [
          {
            "method": "POST",
            "path": "/assignments/:assignmentId/submissions",
            "description": "Student membuat draf submission untuk tugas",
            "authentication": "Required (STUDENT role)",
            "path_parameters": {
              "assignmentId": "string (Assignment ID)"
            },
            "request_body": {
              "content": "string"
            },
            "success_response": {
              "status_code": 201,
              "body": {
                "id": "string",
                "assignmentId": "string",
                "studentId": "string",
                "content": "string",
                "status": "DRAFT",
                "createdAt": "ISO date string"
              }
            }
          },
          {
            "method": "GET",
            "path": "/submissions/history",
            "description": "Mendapat riwayat submission student",
            "authentication": "Required (STUDENT role)",
            "success_response": {
              "status_code": 200,
              "body": [
                {
                  "id": "string",
                  "assignmentId": "string",
                  "content": "string",
                  "status": "string",
                  "createdAt": "ISO date string",
                  "assignment": "object"
                }
              ]
            }
          },
          {
            "method": "GET",
            "path": "/classes/:classId/history",
            "description": "Mendapat riwayat submission di kelas (instructor only)",
            "authentication": "Required (INSTRUCTOR role)",
            "path_parameters": {
              "classId": "string (Class ID)"
            },
            "success_response": {
              "status_code": 200,
              "body": [
                {
                  "id": "string",
                  "student": {
                    "id": "string",
                    "fullName": "string"
                  },
                  "assignment": {
                    "id": "string",
                    "title": "string"
                  },
                  "status": "string",
                  "createdAt": "ISO date string"
                }
              ]
            }
          },
          {
            "method": "GET",
            "path": "/submissions/:id/download",
            "description": "Download submission sebagai PDF atau DOCX",
            "authentication": "Required (JWT)",
            "path_parameters": {
              "id": "string (Submission ID)"
            },
            "query_parameters": {
              "format": "pdf | docx (default: pdf)"
            },
            "success_response": {
              "status_code": 200,
              "body": {
                "filename": "string",
                "url": "string (pre-signed URL)",
                "size": "number",
                "format": "pdf | docx",
                "cloudKey": "string",
                "generatedAt": "ISO date string"
              }
            }
          },
          {
            "method": "GET",
            "path": "/submissions/:id",
            "description": "Mendapat detail submission",
            "authentication": "Required (JWT)",
            "path_parameters": {
              "id": "string (Submission ID)"
            },
            "success_response": {
              "status_code": 200,
              "body": {
                "id": "string",
                "assignmentId": "string",
                "studentId": "string",
                "content": "string",
                "status": "string",
                "createdAt": "ISO date string",
                "assignment": "object",
                "plagiarismChecks": "object | null"
              }
            }
          },
          {
            "method": "PATCH",
            "path": "/submissions/:id/content",
            "description": "Student update konten submission (auto-save)",
            "authentication": "Required (STUDENT role)",
            "path_parameters": {
              "id": "string (Submission ID)"
            },
            "request_body": {
              "content": "string"
            },
            "success_response": {
              "status_code": 200,
              "body": {
                "id": "string",
                "content": "string",
                "status": "string",
                "updatedAt": "ISO date string"
              }
            }
          },
          {
            "method": "POST",
            "path": "/submissions/:id/submit",
            "description": "Student mengirimkan tugas untuk dinilai",
            "authentication": "Required (STUDENT role)",
            "path_parameters": {
              "id": "string (Submission ID)"
            },
            "success_response": {
              "status_code": 200,
              "body": {
                "id": "string",
                "status": "SUBMITTED",
                "submittedAt": "ISO date string"
              }
            }
          },
          {
            "method": "PATCH",
            "path": "/submissions/:id/grade",
            "description": "Instructor memberikan nilai pada submission",
            "authentication": "Required (INSTRUCTOR role)",
            "path_parameters": {
              "id": "string (Submission ID)"
            },
            "request_body": {
              "grade": "number"
            },
            "success_response": {
              "status_code": 200,
              "body": {
                "id": "string",
                "grade": "number",
                "status": "GRADED",
                "updatedAt": "ISO date string"
              }
            }
          },
          {
            "method": "GET",
            "path": "/classes/:classId/assignments/:assignmentId/submissions",
            "description": "Instructor mendapat semua submission untuk assignment",
            "authentication": "Required (INSTRUCTOR role)",
            "path_parameters": {
              "classId": "string (Class ID)",
              "assignmentId": "string (Assignment ID)"
            },
            "success_response": {
              "status_code": 200,
              "body": [
                {
                  "id": "string",
                  "student": {
                    "id": "string",
                    "fullName": "string"
                  },
                  "status": "string",
                  "updatedAt": "ISO date string",
                  "plagiarismChecks": "object | null"
                }
              ]
            }
          },
          {
            "method": "GET",
            "path": "/submissions/:id/versions",
            "description": "Mendapat semua versi submission",
            "authentication": "Required (JWT)",
            "path_parameters": {
              "id": "string (Submission ID)"
            },
            "success_response": {
              "status_code": 200,
              "body": [
                {
                  "version": "number",
                  "content": "string",
                  "updatedAt": "ISO date string"
                }
              ]
            }
          },
          {
            "method": "GET",
            "path": "/submissions/:id/versions/:version",
            "description": "Mendapat versi spesifik submission",
            "authentication": "Required (JWT)",
            "path_parameters": {
              "id": "string (Submission ID)",
              "version": "number (Version number)"
            },
            "success_response": {
              "status_code": 200,
              "body": {
                "version": "number",
                "content": "string",
                "updatedAt": "ISO date string"
              }
            }
          }
        ]
      },
      "plagiarism": {
        "base_path": "/plagiarism",
        "endpoints": [
          {
            "method": "POST",
            "path": "/submissions/:id/check-plagiarism",
            "description": "Instructor memicu pengecekan plagiarisme submission",
            "authentication": "Required (INSTRUCTOR role)",
            "path_parameters": {
              "id": "string (Submission ID)"
            },
            "request_body": {
              "excluded_sources": "string[] (optional)",
              "language": "string (optional)",
              "country": "string (optional)"
            },
            "success_response": {
              "status_code": 200,
              "body": {
                "jobId": "string",
                "status": "queued | processing | completed",
                "message": "string",
                "score": "number (if completed)",
                "wordCount": "number (if completed)",
                "creditsUsed": "number (if completed)",
                "completedAt": "ISO date string (if completed)"
              }
            }
          },
          {
            "method": "GET",
            "path": "/submissions/:id/plagiarism-report",
            "description": "Mendapat hasil pengecekan plagiarisme dan URL laporan PDF",
            "authentication": "Required (JWT)",
            "path_parameters": {
              "id": "string (Submission ID)"
            },
            "success_response": {
              "status_code": 200,
              "body": {
                "submissionId": "string",
                "status": "string",
                "score": "number",
                "wordCount": "number",
                "creditsUsed": "number",
                "checkedAt": "ISO date string",
                "pdfReportUrl": "string",
                "detailedResults": "object (instructor only)"
              }
            }
          },
          {
            "method": "GET",
            "path": "/plagiarism/queue-stats",
            "description": "Monitor status antrian plagiarisme (debugging)",
            "authentication": "Required (INSTRUCTOR role)",
            "success_response": {
              "status_code": 200,
              "body": {
                "waiting": "number",
                "active": "number",
                "completed": "number",
                "failed": "number",
                "total": "number"
              }
            }
          }
        ]
      },
      "payments": {
        "base_path": "/payments",
        "endpoints": [
          {
            "method": "POST",
            "path": "/payments/create-transaction",
            "description": "Instructor membuat transaksi pembayaran (Midtrans)",
            "authentication": "Required (INSTRUCTOR role)",
            "request_body": {
              "amount": "number",
              "assignmentId": "string (optional)"
            },
            "success_response": {
              "status_code": 201,
              "body": {
                "transactionId": "string",
                "snapToken": "string",
                "paymentUrl": "string",
                "status": "PENDING"
              }
            }
          },
          {
            "method": "POST",
            "path": "/payments/webhook",
            "description": "Endpoint webhook untuk notifikasi pembayaran dari Midtrans",
            "authentication": "Not required (webhook)",
            "request_body": {
              "order_id": "string",
              "transaction_status": "string",
              "signature_key": "string",
              "status_code": "string",
              "gross_amount": "string",
              "fraud_status": "string (optional)",
              "payment_type": "string (optional)"
            },
            "success_response": {
              "status_code": 200,
              "body": {
                "message": "Webhook processed successfully"
              }
            }
          },
          {
            "method": "GET",
            "path": "/payments/transactions",
            "description": "Mendapat riwayat transaksi instructor dengan pagination",
            "authentication": "Required (INSTRUCTOR role)",
            "query_parameters": {
              "page": "number (default: 1)",
              "limit": "number (default: 10, max: 50)",
              "status": "string (optional)",
              "startDate": "string (optional)",
              "endDate": "string (optional)",
              "assignmentId": "string (optional)"
            },
            "success_response": {
              "status_code": 200,
              "body": {
                "data": [
                  {
                    "id": "string",
                    "orderId": "string",
                    "amount": "number",
                    "status": "string",
                    "paymentMethod": "string",
                    "createdAt": "ISO date string",
                    "assignment": {
                      "id": "string",
                      "title": "string",
                      "class": {
                        "name": "string"
                      }
                    },
                    "expectedStudentCount": "number"
                  }
                ],
                "page": "number",
                "limit": "number",
                "total": "number",
                "totalPages": "number"
              }
            }
          }
        ]
      },
      "storage": {
        "base_path": "/storage",
        "endpoints": [
          {
            "method": "GET",
            "path": "/storage/health",
            "description": "Cek status kesehatan layanan storage",
            "authentication": "Not required",
            "success_response": {
              "status_code": 200,
              "body": {
                "status": "healthy",
                "timestamp": "ISO date string",
                "service": "storage",
                "cloudStorage": {
                  "status": "healthy",
                  "bucket": "string",
                  "endpoint": "string"
                },
                "features": {
                  "pdfGeneration": "enabled",
                  "docxGeneration": "enabled",
                  "cloudUpload": "enabled",
                  "presignedUrls": "enabled"
                }
              }
            }
          },
          {
            "method": "GET",
            "path": "/storage/refresh-url/:cloudKey",
            "description": "Refresh pre-signed URL untuk file yang ada",
            "authentication": "Required (JWT)",
            "path_parameters": {
              "cloudKey": "string (Cloud storage key)"
            },
            "query_parameters": {
              "filename": "string (required)",
              "expires": "string (optional, default: 3600)"
            },
            "success_response": {
              "status_code": 200,
              "body": {
                "url": "string",
                "expiresIn": "number",
                "expiresAt": "ISO date string"
              }
            }
          },
          {
            "method": "POST",
            "path": "/storage/upload",
            "description": "Upload file attachment untuk assignment atau submission",
            "authentication": "Required (JWT)",
            "content_type": "multipart/form-data",
            "request_body": {
              "file": "binary (PDF, DOC, DOCX, JPG, PNG, ZIP)",
              "assignmentId": "string (optional)",
              "submissionId": "string (optional)",
              "description": "string (optional)"
            },
            "success_response": {
              "status_code": 201,
              "body": {
                "id": "string",
                "filename": "string",
                "size": "number",
                "mimeType": "string",
                "cloudKey": "string",
                "uploadedAt": "ISO date string"
              }
            }
          }
        ]
      },
      "root_endpoints": {
        "base_path": "/",
        "endpoints": [
          {
            "method": "GET",
            "path": "/",
            "description": "Welcome message dan informasi API",
            "authentication": "Not required",
            "success_response": {
              "status_code": 200,
              "body": {
                "message": "Welcome to Protextify Backend API",
                "version": "2.0.0",
                "timestamp": "ISO date string",
                "service": "protextify-backend",
                "description": "Backend API untuk platform deteksi plagiarisme dan manajemen tugas",
                "endpoints": "object"
              }
            }
          },
          {
            "method": "GET",
            "path": "/health",
            "description": "Health check dengan informasi detail sistem",
            "authentication": "Not required",
            "success_response": {
              "status_code": 200,
              "body": {
                "status": "healthy",
                "timestamp": "ISO date string",
                "service": "protextify-backend",
                "version": "2.0.0",
                "uptime": "number",
                "memory": {
                  "used": "string",
                  "total": "string",
                  "rss": "string"
                },
                "environment": "string",
                "node": "string",
                "platform": "string",
                "pid": "number"
              }
            }
          },
          {
            "method": "GET",
            "path": "/api",
            "description": "Informasi endpoints API",
            "authentication": "Not required",
            "success_response": {
              "status_code": 200,
              "body": {
                "message": "Protextify Backend API v2.0",
                "version": "2.0.0",
                "timestamp": "ISO date string",
                "service": "protextify-backend-api",
                "documentation": "/api/docs",
                "endpoints": "object",
                "websocket": "object",
                "status": "operational"
              }
            }
          },
          {
            "method": "GET",
            "path": "/api/health",
            "description": "API health check dengan detail lengkap",
            "authentication": "Not required",
            "success_response": {
              "status_code": 200,
              "body": {
                "status": "healthy",
                "timestamp": "ISO date string",
                "service": "protextify-backend-api",
                "version": "2.0.0",
                "api": "operational",
                "database": "connected",
                "redis": "connected",
                "storage": "healthy",
                "uptime": "number",
                "memory": "object",
                "environment": "string"
              }
            }
          }
        ]
      }
    },
    "websocket_events": {
      "url": "ws://localhost:3000",
      "events": [
        {
          "event": "updateContent",
          "description": "Auto-save konten editor student",
          "payload": {
            "submissionId": "string",
            "content": "string",
            "updatedAt": "ISO date string"
          }
        },
        {
          "event": "notification",
          "description": "Notifikasi real-time ke user",
          "payload": {
            "type": "string",
            "message": "string",
            "data": "object (optional)",
            "createdAt": "ISO date string"
          }
        },
        {
          "event": "submissionUpdated",
          "description": "Broadcast perubahan submission",
          "payload": {
            "submissionId": "string",
            "status": "string",
            "grade": "number (optional)",
            "plagiarismScore": "number (optional)",
            "updatedAt": "ISO date string"
          }
        },
        {
          "event": "submissionListUpdated",
          "description": "Update daftar submission untuk monitoring instructor",
          "payload": {
            "assignmentId": "string",
            "submissions": [
              {
                "submissionId": "string",
                "studentId": "string",
                "status": "string",
                "plagiarismScore": "number (optional)",
                "lastUpdated": "ISO date string"
              }
            ]
          }
        }
      ]
    },
    "authentication": {
      "type": "JWT Bearer Token",
      "header": "Authorization: Bearer <token>",
      "roles": ["STUDENT", "INSTRUCTOR"],
      "note": "Token didapat dari endpoint /auth/login atau /auth/google/callback"
    },
    "error_responses": {
      "400": "Bad Request - Validasi input gagal",
      "401": "Unauthorized - Token tidak valid/expired",
      "403": "Forbidden - Tidak memiliki permission",
      "404": "Not Found - Resource tidak ditemukan",
      "409": "Conflict - Data sudah ada",
      "500": "Internal Server Error - Error server"
    },
    "file_upload_limits": {
      "pdf": "10MB",
      "doc_docx": "10MB",
      "images": "5MB",
      "zip": "20MB",
      "supported_types": ["PDF", "DOC", "DOCX", "JPG", "PNG", "ZIP"]
    },
    "notes": {
      "versioning": "Submission content memiliki sistem versioning otomatis",
      "plagiarism": "Pengecekan plagiarisme menggunakan queue system dengan Winston AI",
      "payments": "Sistem pembayaran terintegrasi dengan Midtrans",
      "storage": "File storage menggunakan Cloudflare R2 dengan pre-signed URLs",
      "realtime": "WebSocket untuk notifikasi real-time dan auto-save",
      "swagger": "Dokumentasi Swagger tersedia di /api/docs",
      "auth_improvements": "Auth endpoints telah disesuaikan dengan kebutuhan Frontend - format tanggal ISO, field accessToken konsisten, forgot/reset password tersedia"
    }
  }
}
```
