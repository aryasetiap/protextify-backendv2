# 📋 Rencana Perubahan Backend untuk Student Dashboard

Berdasarkan analisis file `student-dashboard-endpoint-expectation.md` dan dokumentasi existing backend, berikut adalah daftar lengkap task implementasi yang diperlukan:

---

## 🔥 **HIGH PRIORITY TASKS**

### 1. **GET /assignments/recent**

- **Status:** ❌ **BELUM ADA**
- **Jenis Aksi:** CREATE
- **Perubahan yang Diperlukan:**
  - Buat endpoint baru di `AssignmentsController`
  - Implementasi service method untuk mendapatkan tugas terbaru berdasarkan deadline
  - Filter hanya assignment yang aktif dan relevan untuk student
  - Support query parameter `limit` (default: 3)
- **Response Structure:**
  ```json
  [
    {
      "id": "assignment-xyz",
      "title": "Tugas Kalkulus",
      "deadline": "2025-12-31T23:59:59.000Z",
      "class": { "name": "Kelas Kalkulus" },
      "active": true
    }
  ]
  ```

### 2. **GET /classes - Response Structure Enhancement**

- **Status:** ⚠️ **PERLU MODIFIKASI**
- **Jenis Aksi:** MODIFY
- **Perubahan yang Diperlukan:**
  - Modifikasi `ClassesService.getClasses()`
  - Tambahkan field `currentUserEnrollment` dalam response
  - Include nested assignments dengan field `deadline` dan `active`
  - Include instructor detail (`id`, `fullName`)
  - Pastikan response berupa array classes langsung (bukan nested dalam enrollments)
- **Current vs Expected:**

  ```json
  // Current (untuk student):
  [{ "class": {...}, "student": {...} }]

  // Expected:
  [{ "id": "...", "name": "...", "instructor": {...}, "assignments": [...], "currentUserEnrollment": {...} }]
  ```

### 3. **GET /submissions/history - Response Enhancement**

- **Status:** ⚠️ **PERLU MODIFIKASI**
- **Jenis Aksi:** MODIFY
- **Perubahan yang Diperlukan:**
  - Modifikasi `SubmissionsService` untuk include assignment detail
  - Tambahkan nested object `assignment.class.name`
  - Include `plagiarismScore` jika ada
  - Include `grade` jika status GRADED
- **Missing Fields:**
  - `assignment.class.name`
  - `plagiarismScore`
  - `grade`

---

## 🔶 **MEDIUM PRIORITY TASKS**

### 4. **GET /classes/:id - Response Alignment**

- **Status:** ⚠️ **PERLU MODIFIKASI**
- **Jenis Aksi:** ALIGN STRUCTURE
- **Perubahan yang Diperlukan:**
  - Verifikasi `ClassesService.getClassDetail()`
  - Pastikan assignments include field `deadline` dan `active`
  - Pastikan instructor object hanya expose `id` dan `fullName`
- **Reference:** Endpoint sudah ada di `ClassesController`

### 5. **GET /classes/:classId/assignments - Response Verification**

- **Status:** ✅ **SUDAH ADA** - PERLU VERIFIKASI
- **Jenis Aksi:** VERIFY
- **Perubahan yang Diperlukan:**
  - Verifikasi response structure sudah sesuai expectation FE
  - Pastikan field `_count.submissions` tersedia
  - Pastikan student hanya melihat active assignments
- **Reference:** Endpoint ada di `AssignmentsController`

### 6. **WebSocket Events - Payload Verification**

- **Status:** ⚠️ **PERLU VERIFIKASI**
- **Jenis Aksi:** VERIFY
- **Perubahan yang Diperlukan:**
  - Verifikasi event `notification` payload structure
  - Verifikasi event `submissionUpdated` payload
  - Verifikasi event `submissionListUpdated` payload
  - Pastikan semua event sesuai dengan events.ts

---

## 🔷 **LOW PRIORITY TASKS**

### 7. **GET /submissions/:id - Response Verification**

- **Status:** ✅ **SUDAH ADA** - PERLU VERIFIKASI
- **Jenis Aksi:** VERIFY
- **Perubahan yang Diperlukan:**
  - Pastikan response structure sesuai expectation
- **Reference:** Endpoint ada di `SubmissionsController`

### 8. **PATCH /submissions/:id/content - Response Verification**

- **Status:** ✅ **SUDAH ADA** - PERLU VERIFIKASI
- **Jenis Aksi:** VERIFY
- **Perubahan yang Diperlukan:**
  - Pastikan response structure sesuai expectation
- **Reference:** Endpoint ada di `SubmissionsController`

### 9. **POST /submissions/:id/submit - Response Verification**

- **Status:** ✅ **SUDAH ADA** - PERLU VERIFIKASI
- **Jenis Aksi:** VERIFY
- **Perubahan yang Diperlukan:**
  - Pastikan response include `submittedAt` field
- **Reference:** Endpoint ada di `SubmissionsController`

---

## 📝 **DETAILED IMPLEMENTATION TASKS**

### Task 1: Implement GET /assignments/recent

```typescript
// src/assignments/assignments.controller.ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT')
@Get('/assignments/recent')
@ApiOperation({
  summary: 'Get recent assignments for student',
  description: 'Returns recent assignments ordered by deadline or creation date.'
})
async getRecentAssignments(
  @Req() req,
  @Query('limit') limit = 3
) {
  return this.assignmentsService.getRecentAssignments(req.user.userId, limit);
}
```

```typescript
// src/assignments/assignments.service.ts
async getRecentAssignments(userId: string, limit = 3) {
  // Get classes that user enrolled in
  const enrolledClasses = await this.prisma.classEnrollment.findMany({
    where: { studentId: userId },
    select: { classId: true }
  });

  const classIds = enrolledClasses.map(e => e.classId);

  // Get recent assignments from those classes
  return this.prisma.assignment.findMany({
    where: {
      classId: { in: classIds },
      active: true
    },
    take: limit,
    orderBy: [
      { deadline: 'asc' },
      { createdAt: 'desc' }
    ],
    include: {
      class: { select: { name: true } }
    }
  });
}
```

### Task 2: Modify GET /classes Response Structure

```typescript
// src/classes/classes.service.ts
async getClasses(userId: string, role: string) {
  if (role === 'INSTRUCTOR') {
    return this.prisma.class.findMany({
      where: { instructorId: userId },
      include: {
        instructor: { select: { id: true, fullName: true } },
        enrollments: { include: { student: true } },
        assignments: {
          select: {
            id: true,
            title: true,
            deadline: true,
            active: true
          }
        }
      }
    });
  }

  // For students - restructure response
  const enrollments = await this.prisma.classEnrollment.findMany({
    where: { studentId: userId },
    include: {
      class: {
        include: {
          instructor: { select: { id: true, fullName: true } },
          enrollments: { include: { student: { select: { id: true, fullName: true } } } },
          assignments: {
            where: { active: true },
            select: {
              id: true,
              title: true,
              deadline: true,
              active: true
            }
          }
        }
      }
    }
  });

  // Transform to expected structure
  return enrollments.map(enrollment => ({
    ...enrollment.class,
    currentUserEnrollment: {
      id: enrollment.id,
      joinedAt: enrollment.joinedAt
    }
  }));
}
```

### Task 3: Enhance GET /submissions/history Response

```typescript
// src/submissions/submissions.service.ts
async getSubmissionHistory(userId: string) {
  return this.prisma.submission.findMany({
    where: { studentId: userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      assignment: {
        include: {
          class: { select: { name: true } }
        }
      },
      plagiarismChecks: { select: { score: true } }
    }
  });
}
```

---

## 🎯 **SPRINT PLANNING SUMMARY**

### Sprint 1 (Week 1)

- ✅ Implement `GET /assignments/recent` endpoint
- ✅ Modify `GET /classes` response structure
- ✅ Enhance `GET /submissions/history` response

### Sprint 2 (Week 2)

- ✅ Verify and align all existing endpoint responses
- ✅ Test WebSocket event payloads
- ✅ Update API documentation

### Sprint 3 (Week 3)

- ✅ Integration testing with Frontend
- ✅ Performance optimization
- ✅ Error handling improvements

---

## 📚 **FILES TO MODIFY**

1. **Controller Files:**
   - assignments.controller.ts
   - classes.controller.ts

2. **Service Files:**
   - assignments.service.ts
   - classes.service.ts
   - submissions.service.ts

3. **DTO Files (if needed):**
   - Create `GetRecentAssignmentsDto` if query validation needed

4. **Documentation:**
   - Update Daftar Lengkap Endpoint API Protextify.md

---

## ⚠️ **CRITICAL NOTES**

1. **Database Schema:** Current `schema.prisma` sudah mencukupi, tidak perlu perubahan
2. **Authentication:** Semua endpoint sudah menggunakan JWT Auth yang benar
3. **Role Guards:** Pastikan `@Roles('STUDENT')` diterapkan pada endpoint yang sesuai
4. **Error Handling:** Follow existing pattern di codebase
5. **API Documentation:** Update Swagger annotations untuk endpoint baru

Dengan implementasi task-task di atas, seluruh kebutuhan Frontend untuk Student Dashboard akan terpenuhi dengan sempurna.
