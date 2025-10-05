# Daftar Task Perubahan Backend untuk Menyesuaikan dengan Ekspektasi FE (Classes Page)

## 1. GET /classes

**Status saat ini:** ✅ Ada - Perlu perbaikan struktur response

**Perubahan yang diperlukan:**

- Modifikasi [`ClassesService.getClasses()`](src/classes/classes.service.ts) untuk student role
- Tambahkan field `currentUserEnrollment` dalam response
- Include field `description` dan `createdAt` di level kelas
- Pastikan response langsung berupa array classes (bukan nested dalam enrollments)
- Include nested assignments dengan field `deadline` dan `active`
- Include instructor detail (`id`, `fullName`)

**Prioritas:** High
**Estimasi waktu:** 4 jam

## 2. GET /classes/:id

**Status saat ini:** ✅ Ada - Perlu enhancement minor

**Perubahan yang diperlukan:**

- Verifikasi [`ClassesService.getClassDetail()`](src/classes/classes.service.ts) sudah include field `instructions` dan `createdAt` pada assignments
- Tambahkan field `currentUserEnrollment` untuk student yang mengakses
- Pastikan field `description` dan `createdAt` tersedia di level kelas

**Prioritas:** Medium
**Estimasi waktu:** 2 jam

## 3. GET /classes/preview/:classToken

**Status saat ini:** ❌ Belum ada

**Perubahan yang diperlukan:**

- Buat endpoint baru di [`ClassesController`](src/classes/classes.controller.ts)
- Implementasi method `previewClass()` di [`ClassesService`](src/classes/classes.service.ts)
- Include fields: `name`, `description`, `instructor` info, `studentsCount`, `assignmentsCount`
- Validasi token exists tanpa require authentication (public endpoint)

**Prioritas:** High
**Estimasi waktu:** 3 jam

```typescript
// src/classes/classes.controller.ts
@Get('preview/:classToken')
@ApiOperation({
  summary: 'Preview class information before joining',
  description: 'Public endpoint to preview class details using class token'
})
async previewClass(@Param('classToken') classToken: string) {
  return this.classesService.previewClass(classToken);
}
```

## 4. POST /classes/join

**Status saat ini:** ✅ Ada - Response sesuai ekspektasi

**Perubahan yang diperlukan:**

- ✅ Tidak ada perubahan diperlukan
- Response structure sudah sesuai dengan ekspektasi FE

**Prioritas:** ✅ Complete
**Estimasi waktu:** 0 jam

## 5. GET /classes/:classId/assignments

**Status saat ini:** ✅ Ada - Perlu verifikasi response structure

**Perubahan yang diperlukan:**

- Verifikasi [`AssignmentsService.getAssignments()`](src/assignments/assignments.service.ts) include field `_count.submissions`
- Pastikan student hanya melihat assignments dengan `active: true`
- Include fields: `expectedStudentCount`, `createdAt`, `updatedAt`
- Verifikasi submissions array structure untuk student role

**Prioritas:** Medium
**Estimasi waktu:** 2 jam

## Implementasi Detail

### Task 1: Modifikasi GET /classes untuk Student

```typescript
// src/classes/classes.service.ts
async getClasses(userId: string, role: string) {
  if (role === 'INSTRUCTOR') {
    // ... existing instructor logic
  }

  // Enhanced student logic
  const enrollments = await this.prisma.classEnrollment.findMany({
    where: { studentId: userId },
    include: {
      class: {
        include: {
          instructor: { select: { id: true, fullName: true } },
          enrollments: {
            include: {
              student: { select: { id: true, fullName: true } }
            }
          },
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

  // Transform to expected FE structure
  return enrollments.map(enrollment => ({
    ...enrollment.class,
    currentUserEnrollment: {
      id: enrollment.id,
      joinedAt: enrollment.joinedAt
    }
  }));
}
```

### Task 2: Implementasi GET /classes/preview/:classToken

```typescript
// src/classes/classes.service.ts
async previewClass(classToken: string) {
  const kelas = await this.prisma.class.findUnique({
    where: { classToken },
    include: {
      instructor: {
        select: {
          id: true,
          fullName: true,
          institution: true
        }
      },
      enrollments: true,
      assignments: {
        where: { active: true }
      }
    }
  });

  if (!kelas) throw new NotFoundException('Class not found');

  return {
    id: kelas.id,
    name: kelas.name,
    description: kelas.description,
    instructor: kelas.instructor,
    studentsCount: kelas.enrollments.length,
    assignmentsCount: kelas.assignments.length,
    createdAt: kelas.createdAt
  };
}
```

### Task 3: Enhancement GET /classes/:id

```typescript
// src/classes/classes.service.ts - existing method enhancement
async getClassDetail(classId: string, userId?: string) {
  const kelas = await this.prisma.class.findUnique({
    where: { id: classId },
    include: {
      instructor: { select: { id: true, fullName: true } },
      enrollments: {
        include: {
          student: { select: { id: true, fullName: true } }
        }
      },
      assignments: {
        select: {
          id: true,
          title: true,
          instructions: true,
          deadline: true,
          active: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!kelas) throw new NotFoundException('Class not found');

  // Add currentUserEnrollment if userId provided
  let currentUserEnrollment = null;
  if (userId) {
    const enrollment = await this.prisma.classEnrollment.findUnique({
      where: {
        studentId_classId: {
          studentId: userId,
          classId: classId
        }
      }
    });

    if (enrollment) {
      currentUserEnrollment = {
        id: enrollment.id,
        joinedAt: enrollment.joinedAt
      };
    }
  }

  return {
    ...kelas,
    currentUserEnrollment
  };
}
```

## Files to Modify

1. **Controller Files:**
   - [`src/classes/classes.controller.ts`](src/classes/classes.controller.ts)

2. **Service Files:**
   - [`src/classes/classes.service.ts`](src/classes/classes.service.ts)
   - [`src/assignments/assignments.service.ts`](src/assignments/assignments.service.ts)

3. **Documentation:**
   - Update [`doc/Daftar Lengkap Endpoint API Protextify.md`](doc/Daftar Lengkap Endpoint API Protextify.md)

## Catatan Kompatibilitas

- ⚠️ **GET /classes/:id** juga digunakan di dashboard overview dan instructor pages
- ⚠️ **GET /classes** juga digunakan di dashboard overview
- Pastikan perubahan tidak merusak kompatibilitas dengan page lain
- Tambahkan optional parameter `userId` pada `getClassDetail()` untuk conditional `currentUserEnrollment`

## Sprint Planning

### Sprint 1 (Week 1)

- ✅ Implementasi GET /classes/preview/:classToken
- ✅ Enhancement GET /classes response structure

### Sprint 2 (Week 2)

- ✅ Verifikasi dan align GET /classes/:id
- ✅ Verifikasi GET /classes/:classId/assignments
- ✅ Update documentation

### Total Estimasi: 11 jam (1.5 hari kerja)

## Critical Notes

1. **Database Schema:** Current [`schema.prisma`](prisma/schema.prisma) sudah mencukupi
2. **Authentication:** Endpoint /classes/preview/:classToken harus public (no auth required)
3. **Role Guards:** Pastikan existing guards tidak terpengaruh
4. **Error Handling:** Follow existing pattern di codebase
5. **API Documentation:** Update Swagger annotations untuk endpoint baru
