import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

// 🔧 Define interface untuk version data
interface VersionData {
  id: string;
  submissionId: string;
  version: number;
  content: string;
  updatedAt: Date;
}

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Seed Users (Instructors and Students)
  await seedUsers();

  // 2. Seed Credit Balances
  await seedCreditBalances();

  // 3. Seed Classes
  await seedClasses();

  // 4. Seed Class Enrollments
  await seedClassEnrollments();

  // 5. Seed Assignments
  await seedAssignments();

  // 6. Seed Transactions
  await seedTransactions();

  // 7. Seed Submissions
  await seedSubmissions();

  // 8. Seed Plagiarism Checks
  await seedPlagiarismChecks();

  // 9. Seed Submission Versions (🆕 New)
  await seedSubmissionVersions();

  console.log('✅ Database seeding completed successfully!');
}

/**
 * Seed Users (Instructors and Students)
 */
async function seedUsers() {
  console.log('👥 Seeding users...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Instructors
  const instructors = [
    {
      id: 'instructor-1',
      email: 'john.instructor@university.edu',
      fullName: 'Dr. John Smith',
      password: hashedPassword,
      role: 'INSTRUCTOR' as const,
      institution: 'University of Technology',
      emailVerified: true,
      phone: '+62812-3456-7890',
    },
    {
      id: 'instructor-2',
      email: 'sarah.instructor@university.edu',
      fullName: 'Dr. Sarah Johnson',
      password: hashedPassword,
      role: 'INSTRUCTOR' as const,
      institution: 'University of Technology',
      emailVerified: true,
      phone: '+62812-3456-7891',
    },
    {
      id: 'instructor-3',
      email: 'mike.instructor@university.edu',
      fullName: 'Prof. Michael Brown',
      password: hashedPassword,
      role: 'INSTRUCTOR' as const,
      institution: 'University of Technology',
      emailVerified: true,
      phone: '+62812-3456-7892',
    },
  ];

  // Students
  const students = [
    {
      id: 'student-1',
      email: 'alice.student@university.edu',
      fullName: 'Alice Williams',
      password: hashedPassword,
      role: 'STUDENT' as const,
      institution: 'University of Technology',
      emailVerified: true,
      phone: '+62812-1111-1111',
    },
    {
      id: 'student-2',
      email: 'bob.student@university.edu',
      fullName: 'Bob Davis',
      password: hashedPassword,
      role: 'STUDENT' as const,
      institution: 'University of Technology',
      emailVerified: true,
      phone: '+62812-2222-2222',
    },
    {
      id: 'student-3',
      email: 'charlie.student@university.edu',
      fullName: 'Charlie Miller',
      password: hashedPassword,
      role: 'STUDENT' as const,
      institution: 'University of Technology',
      emailVerified: true,
      phone: '+62812-3333-3333',
    },
    {
      id: 'student-4',
      email: 'diana.student@university.edu',
      fullName: 'Diana Wilson',
      password: hashedPassword,
      role: 'STUDENT' as const,
      institution: 'University of Technology',
      emailVerified: true,
      phone: '+62812-4444-4444',
    },
    {
      id: 'student-5',
      email: 'edward.student@university.edu',
      fullName: 'Edward Taylor',
      password: hashedPassword,
      role: 'STUDENT' as const,
      institution: 'University of Technology',
      emailVerified: true,
      phone: '+62812-5555-5555',
    },
  ];

  const allUsers = [...instructors, ...students];

  for (const userData of allUsers) {
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: userData,
    });
  }

  console.log(
    `   ✅ Created/updated ${allUsers.length} users (${instructors.length} instructors, ${students.length} students)`,
  );
}

/**
 * Seed Credit Balances for all users
 */
async function seedCreditBalances() {
  console.log('💰 Seeding credit balances...');

  const users = await prisma.user.findMany();

  for (const user of users) {
    const credits = user.role === 'INSTRUCTOR' ? 100 : 25; // Instructors get more credits

    await prisma.creditBalance.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        credits: credits,
      },
    });
  }

  console.log(
    `   ✅ Created/updated credit balances for ${users.length} users`,
  );
}

/**
 * Seed Classes
 */
async function seedClasses() {
  console.log('🏫 Seeding classes...');

  const instructors = await prisma.user.findMany({
    where: { role: 'INSTRUCTOR' },
  });

  const classes = [
    {
      id: 'class-1',
      name: 'Introduction to Computer Science',
      description: 'Basic concepts of computer science and programming',
      classToken: nanoid(8),
      instructorId: instructors[0].id,
    },
    {
      id: 'class-2',
      name: 'Data Structures and Algorithms',
      description: 'Advanced data structures and algorithmic thinking',
      classToken: nanoid(8),
      instructorId: instructors[0].id,
    },
    {
      id: 'class-3',
      name: 'Web Development Fundamentals',
      description: 'HTML, CSS, JavaScript and modern web technologies',
      classToken: nanoid(8),
      instructorId: instructors[1].id,
    },
    {
      id: 'class-4',
      name: 'Database Management Systems',
      description: 'Relational databases, SQL, and database design',
      classToken: nanoid(8),
      instructorId: instructors[1].id,
    },
    {
      id: 'class-5',
      name: 'Software Engineering Principles',
      description: 'Best practices in software development lifecycle',
      classToken: nanoid(8),
      instructorId: instructors[2].id,
    },
  ];

  for (const classData of classes) {
    await prisma.class.upsert({
      where: { id: classData.id },
      update: {},
      create: classData,
    });
  }

  console.log(`   ✅ Created/updated ${classes.length} classes`);
}

/**
 * Seed Class Enrollments
 */
async function seedClassEnrollments() {
  console.log('📚 Seeding class enrollments...');

  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
  });

  const classes = await prisma.class.findMany();

  // Each student enrolls in 2-3 classes randomly
  const enrollments = [
    // Student 1: Alice - enrolled in 3 classes
    { studentId: students[0].id, classId: classes[0].id },
    { studentId: students[0].id, classId: classes[1].id },
    { studentId: students[0].id, classId: classes[2].id },

    // Student 2: Bob - enrolled in 2 classes
    { studentId: students[1].id, classId: classes[0].id },
    { studentId: students[1].id, classId: classes[3].id },

    // Student 3: Charlie - enrolled in 3 classes
    { studentId: students[2].id, classId: classes[1].id },
    { studentId: students[2].id, classId: classes[2].id },
    { studentId: students[2].id, classId: classes[4].id },

    // Student 4: Diana - enrolled in 2 classes
    { studentId: students[3].id, classId: classes[2].id },
    { studentId: students[3].id, classId: classes[3].id },

    // Student 5: Edward - enrolled in 3 classes
    { studentId: students[4].id, classId: classes[0].id },
    { studentId: students[4].id, classId: classes[3].id },
    { studentId: students[4].id, classId: classes[4].id },
  ];

  for (const enrollment of enrollments) {
    await prisma.classEnrollment.upsert({
      where: {
        studentId_classId: {
          studentId: enrollment.studentId,
          classId: enrollment.classId,
        },
      },
      update: {},
      create: {
        id: nanoid(),
        studentId: enrollment.studentId,
        classId: enrollment.classId,
      },
    });
  }

  console.log(`   ✅ Created/updated ${enrollments.length} class enrollments`);
}

/**
 * Seed Assignments
 */
async function seedAssignments() {
  console.log('📝 Seeding assignments...');

  const classes = await prisma.class.findMany();

  const assignments = [
    // Class 1: Intro to CS
    {
      id: 'assignment-1',
      title: 'Hello World Program',
      instructions:
        'Write a program that prints "Hello, World!" in your favorite programming language. Include comments explaining each line of code.',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      classId: classes[0].id,
      expectedStudentCount: 10,
      active: true,
    },
    {
      id: 'assignment-2',
      title: 'Basic Calculator',
      instructions:
        'Create a simple calculator that can perform addition, subtraction, multiplication, and division operations.',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      classId: classes[0].id,
      expectedStudentCount: 10,
      active: true,
    },

    // Class 2: Data Structures
    {
      id: 'assignment-3',
      title: 'Array Operations',
      instructions:
        'Implement various array operations including searching, sorting, and manipulation functions.',
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      classId: classes[1].id,
      expectedStudentCount: 8,
      active: true,
    },
    {
      id: 'assignment-4',
      title: 'Linked List Implementation',
      instructions:
        'Create a complete linked list data structure with insertion, deletion, and traversal methods.',
      deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
      classId: classes[1].id,
      expectedStudentCount: 8,
      active: true,
    },

    // Class 3: Web Development
    {
      id: 'assignment-5',
      title: 'Personal Portfolio Website',
      instructions:
        'Design and develop a responsive personal portfolio website using HTML, CSS, and JavaScript.',
      deadline: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), // 28 days from now
      classId: classes[2].id,
      expectedStudentCount: 12,
      active: true,
    },

    // Class 4: Database Management
    {
      id: 'assignment-6',
      title: 'Database Design Project',
      instructions:
        'Design a normalized database schema for a library management system and write SQL queries.',
      deadline: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000), // 18 days from now
      classId: classes[3].id,
      expectedStudentCount: 6,
      active: true,
    },

    // Class 5: Software Engineering
    {
      id: 'assignment-7',
      title: 'Software Requirements Document',
      instructions:
        'Write a comprehensive software requirements specification document for a mobile application.',
      deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days from now
      classId: classes[4].id,
      expectedStudentCount: 15,
      active: true,
    },
  ];

  for (const assignment of assignments) {
    await prisma.assignment.upsert({
      where: { id: assignment.id },
      update: {},
      create: assignment,
    });
  }

  console.log(`   ✅ Created/updated ${assignments.length} assignments`);
}

/**
 * Seed Transactions (Payment history)
 */
async function seedTransactions() {
  console.log('💳 Seeding transactions...');

  const instructors = await prisma.user.findMany({
    where: { role: 'INSTRUCTOR' },
  });

  const assignments = await prisma.assignment.findMany();

  const transactions = [
    // Successful transactions
    {
      id: 'transaction-1',
      userId: instructors[0].id,
      amount: 25000,
      creditsPurchased: 10,
      status: 'SUCCESS' as const,
      midtransTransactionId: 'PROTEXTIFY-' + Date.now() + '-' + nanoid(6),
      midtransToken: 'token-' + nanoid(12),
      assignmentId: assignments[0].id,
    },
    {
      id: 'transaction-2',
      userId: instructors[0].id,
      amount: 20000,
      creditsPurchased: 8,
      status: 'SUCCESS' as const,
      midtransTransactionId:
        'PROTEXTIFY-' + (Date.now() + 1000) + '-' + nanoid(6),
      midtransToken: 'token-' + nanoid(12),
      assignmentId: assignments[1].id,
    },
    {
      id: 'transaction-3',
      userId: instructors[1].id,
      amount: 30000,
      creditsPurchased: 12,
      status: 'SUCCESS' as const,
      midtransTransactionId:
        'PROTEXTIFY-' + (Date.now() + 2000) + '-' + nanoid(6),
      midtransToken: 'token-' + nanoid(12),
      assignmentId: assignments[2].id,
    },

    // Pending transaction
    {
      id: 'transaction-4',
      userId: instructors[2].id,
      amount: 37500,
      creditsPurchased: 15,
      status: 'PENDING' as const,
      midtransTransactionId:
        'PROTEXTIFY-' + (Date.now() + 3000) + '-' + nanoid(6),
      midtransToken: 'token-' + nanoid(12),
      assignmentId: assignments[6].id,
    },

    // Failed transaction
    {
      id: 'transaction-5',
      userId: instructors[1].id,
      amount: 15000,
      creditsPurchased: 6,
      status: 'FAILED' as const,
      midtransTransactionId:
        'PROTEXTIFY-' + (Date.now() + 4000) + '-' + nanoid(6),
      midtransToken: null,
      assignmentId: assignments[3].id,
    },
  ];

  for (const transaction of transactions) {
    await prisma.transaction.upsert({
      where: { id: transaction.id },
      update: {},
      create: transaction,
    });
  }

  console.log(`   ✅ Created/updated ${transactions.length} transactions`);
}

/**
 * Seed Submissions
 */
async function seedSubmissions() {
  console.log('📄 Seeding submissions...');

  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
  });

  const assignments = await prisma.assignment.findMany();

  // Sample submission contents
  const submissionContents = [
    `# Hello World Program

This is my first programming assignment. I chose to write the program in Python because it's beginner-friendly and has clean syntax.

## Code:
\`\`\`python
# This is my first Python program
print("Hello, World!")
print("Welcome to Computer Science!")

# Additional greeting
name = "Alice"
print(f"Hello, {name}!")
\`\`\`

## Explanation:
The print() function is used to display output to the console. The first line prints the classic "Hello, World!" message. The second line adds a welcome message. Finally, I used an f-string to create a personalized greeting.

This program demonstrates basic output operations and string formatting in Python.`,

    `# Basic Calculator Implementation

I have implemented a simple calculator that can perform four basic arithmetic operations.

## Code:
\`\`\`python
def add(a, b):
    return a + b

def subtract(a, b):
    return a - b

def multiply(a, b):
    return a * b

def divide(a, b):
    if b != 0:
        return a / b
    else:
        return "Error: Division by zero"

# Main program
while True:
    print("\\nSimple Calculator")
    print("1. Addition")
    print("2. Subtraction") 
    print("3. Multiplication")
    print("4. Division")
    print("5. Exit")
    
    choice = input("Choose operation (1-5): ")
    
    if choice == '5':
        break
        
    if choice in ['1', '2', '3', '4']:
        num1 = float(input("Enter first number: "))
        num2 = float(input("Enter second number: "))
        
        if choice == '1':
            result = add(num1, num2)
        elif choice == '2':
            result = subtract(num1, num2)
        elif choice == '3':
            result = multiply(num1, num2)
        elif choice == '4':
            result = divide(num1, num2)
            
        print(f"Result: {result}")
    else:
        print("Invalid input")
\`\`\`

## Features:
- Four basic operations: +, -, *, /
- Error handling for division by zero
- User-friendly menu interface
- Input validation
- Continuous operation until user chooses to exit

The calculator handles edge cases and provides a clean user experience.`,

    `# Array Operations Implementation

This assignment covers various array operations including searching, sorting, and manipulation.

## Code:
\`\`\`python
def linear_search(arr, target):
    """Linear search algorithm"""
    for i in range(len(arr)):
        if arr[i] == target:
            return i
    return -1

def binary_search(arr, target):
    """Binary search algorithm (requires sorted array)"""
    left, right = 0, len(arr) - 1
    
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

def bubble_sort(arr):
    """Bubble sort algorithm"""
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr

def find_max_min(arr):
    """Find maximum and minimum values"""
    if not arr:
        return None, None
    return max(arr), min(arr)

def remove_duplicates(arr):
    """Remove duplicate elements"""
    return list(set(arr))

# Test the functions
test_array = [64, 34, 25, 12, 22, 11, 90, 25, 34]
print(f"Original array: {test_array}")

# Sorting
sorted_array = bubble_sort(test_array.copy())
print(f"Sorted array: {sorted_array}")

# Searching
target = 25
index = linear_search(test_array, target)
print(f"Linear search for {target}: index {index}")

# Max/Min
max_val, min_val = find_max_min(test_array)
print(f"Maximum: {max_val}, Minimum: {min_val}")

# Remove duplicates
unique_array = remove_duplicates(test_array)
print(f"Unique elements: {unique_array}")
\`\`\`

## Analysis:
- Linear Search: O(n) time complexity
- Binary Search: O(log n) time complexity (on sorted array)
- Bubble Sort: O(n²) time complexity
- Find Max/Min: O(n) time complexity
- Remove Duplicates: O(n) average time complexity

This implementation demonstrates fundamental array operations with different algorithmic approaches and time complexities.`,

    `# Linked List Data Structure

Complete implementation of a singly linked list with all basic operations.

## Code:
\`\`\`python
class Node:
    def __init__(self, data):
        self.data = data
        self.next = None

class LinkedList:
    def __init__(self):
        self.head = None
        self.size = 0
    
    def insert_at_beginning(self, data):
        """Insert node at the beginning"""
        new_node = Node(data)
        new_node.next = self.head
        self.head = new_node
        self.size += 1
    
    def insert_at_end(self, data):
        """Insert node at the end"""
        new_node = Node(data)
        if not self.head:
            self.head = new_node
        else:
            current = self.head
            while current.next:
                current = current.next
            current.next = new_node
        self.size += 1
    
    def insert_at_position(self, position, data):
        """Insert node at specific position"""
        if position < 0 or position > self.size:
            raise IndexError("Position out of bounds")
        
        if position == 0:
            self.insert_at_beginning(data)
            return
        
        new_node = Node(data)
        current = self.head
        for _ in range(position - 1):
            current = current.next
        
        new_node.next = current.next
        current.next = new_node
        self.size += 1
    
    def delete_by_value(self, data):
        """Delete first occurrence of value"""
        if not self.head:
            return False
        
        if self.head.data == data:
            self.head = self.head.next
            self.size -= 1
            return True
        
        current = self.head
        while current.next:
            if current.next.data == data:
                current.next = current.next.next
                self.size -= 1
                return True
            current = current.next
        return False
    
    def delete_at_position(self, position):
        """Delete node at specific position"""
        if position < 0 or position >= self.size:
            raise IndexError("Position out of bounds")
        
        if position == 0:
            self.head = self.head.next
            self.size -= 1
            return
        
        current = self.head
        for _ in range(position - 1):
            current = current.next
        current.next = current.next.next
        self.size -= 1
    
    def search(self, data):
        """Search for a value and return position"""
        current = self.head
        position = 0
        
        while current:
            if current.data == data:
                return position
            current = current.next
            position += 1
        return -1
    
    def display(self):
        """Display all elements"""
        elements = []
        current = self.head
        while current:
            elements.append(current.data)
            current = current.next
        return elements
    
    def get_size(self):
        """Return size of linked list"""
        return self.size

# Testing the implementation
ll = LinkedList()

# Test insertions
ll.insert_at_end(10)
ll.insert_at_end(20)
ll.insert_at_beginning(5)
ll.insert_at_position(2, 15)

print(f"Linked List: {ll.display()}")
print(f"Size: {ll.get_size()}")

# Test search
print(f"Position of 15: {ll.search(15)}")

# Test deletions
ll.delete_by_value(20)
print(f"After deleting 20: {ll.display()}")

ll.delete_at_position(1)
print(f"After deleting at position 1: {ll.display()}")
\`\`\`

## Features Implemented:
- Node class with data and next pointer
- LinkedList class with head pointer and size tracking
- Insert operations (beginning, end, specific position)
- Delete operations (by value, by position)  
- Search operation with position return
- Display method for visualization
- Size tracking for efficiency

## Time Complexities:
- Insert at beginning: O(1)
- Insert at end: O(n)
- Insert at position: O(n)
- Delete by value: O(n)
- Delete at position: O(n)
- Search: O(n)
- Display: O(n)

This implementation provides a complete and efficient singly linked list data structure.`,
  ];

  const submissions = [
    // Assignment 1: Hello World (3 submissions)
    {
      id: 'submission-1',
      content: submissionContents[0],
      status: 'SUBMITTED' as const,
      grade: 95.0,
      studentId: students[0].id, // Alice
      assignmentId: assignments[0].id,
    },
    {
      id: 'submission-2',
      content: submissionContents[0].replace('Alice', 'Edward'),
      status: 'GRADED' as const,
      grade: 88.0,
      studentId: students[4].id, // Edward
      assignmentId: assignments[0].id,
    },
    {
      id: 'submission-3',
      content: submissionContents[0]
        .replace('Python', 'JavaScript')
        .replace('print(', 'console.log('),
      status: 'SUBMITTED' as const,
      studentId: students[1].id, // Bob
      assignmentId: assignments[0].id,
    },

    // Assignment 2: Calculator (2 submissions)
    {
      id: 'submission-4',
      content: submissionContents[1],
      status: 'GRADED' as const,
      grade: 92.0,
      studentId: students[0].id, // Alice
      assignmentId: assignments[1].id,
    },
    {
      id: 'submission-5',
      content: submissionContents[1],
      status: 'DRAFT' as const,
      studentId: students[4].id, // Edward
      assignmentId: assignments[1].id,
    },

    // Assignment 3: Array Operations (2 submissions)
    {
      id: 'submission-6',
      content: submissionContents[2],
      status: 'SUBMITTED' as const,
      grade: 89.0,
      studentId: students[0].id, // Alice
      assignmentId: assignments[2].id,
    },
    {
      id: 'submission-7',
      content: submissionContents[2],
      status: 'GRADED' as const,
      grade: 85.0,
      studentId: students[2].id, // Charlie
      assignmentId: assignments[2].id,
    },

    // Assignment 4: Linked List (1 submission)
    {
      id: 'submission-8',
      content: submissionContents[3],
      status: 'SUBMITTED' as const,
      studentId: students[2].id, // Charlie
      assignmentId: assignments[3].id,
    },

    // Assignment 5: Portfolio Website (2 submissions)
    {
      id: 'submission-9',
      content: `# Personal Portfolio Website

I have created a responsive personal portfolio website using modern web technologies.

## Technologies Used:
- HTML5 for structure
- CSS3 with Flexbox and Grid for layout
- JavaScript for interactivity
- Font Awesome for icons

## Features:
- Responsive design that works on all devices
- Smooth scrolling navigation
- Interactive contact form
- Project showcase with hover effects
- About section with skills display

## File Structure:
\`\`\`
portfolio/
│   index.html
│   style.css
│   script.js
│   README.md
└── images/
    │   profile.jpg
    └── projects/
\`\`\`

The website includes sections for Home, About, Projects, and Contact, with a clean and modern design aesthetic.`,
      status: 'GRADED' as const,
      grade: 91.0,
      studentId: students[0].id, // Alice
      assignmentId: assignments[4].id,
    },
    {
      id: 'submission-10',
      content: `# Portfolio Website Project

My personal portfolio showcasing my web development skills and projects.

## Design Approach:
- Mobile-first responsive design
- Clean, minimalist aesthetic
- Dark/light theme toggle
- Smooth animations and transitions

## Sections:
1. Hero section with introduction
2. About me with skills and experience
3. Projects gallery with live demos
4. Contact form with validation

## Technical Implementation:
- CSS Grid for layout structure
- JavaScript ES6+ features
- Local storage for theme preference
- Form validation and submission

The website demonstrates my proficiency in front-end web development and modern design principles.`,
      status: 'SUBMITTED' as const,
      studentId: students[2].id, // Charlie
      assignmentId: assignments[4].id,
    },
  ];

  for (const submission of submissions) {
    await prisma.submission.upsert({
      where: { id: submission.id },
      update: {},
      create: submission,
    });
  }

  console.log(`   ✅ Created/updated ${submissions.length} submissions`);
}

/**
 * Seed Plagiarism Checks
 */
async function seedPlagiarismChecks() {
  console.log('🔍 Seeding plagiarism checks...');

  // Get some submitted submissions to add plagiarism checks
  const submissions = await prisma.submission.findMany({
    where: {
      status: { in: ['SUBMITTED', 'GRADED'] },
    },
    take: 5,
  });

  const plagiarismChecks = [
    {
      id: 'plagiarism-1',
      submissionId: submissions[0]?.id,
      score: 15.5,
      status: 'completed',
      wordCount: 245,
      creditsUsed: 1,
      rawResponse: {
        status: 200,
        result: {
          score: 15.5,
          sourceCounts: 2,
          textWordCounts: 245,
          totalPlagiarismWords: 38,
        },
        sources: [
          {
            score: 12.3,
            url: 'https://example.com/programming-basics',
            title: 'Programming Fundamentals Tutorial',
            canAccess: true,
          },
          {
            score: 3.2,
            url: 'https://docs.python.org/tutorial',
            title: 'Python Tutorial - Official Documentation',
            canAccess: true,
          },
        ],
        credits_used: 1,
        credits_remaining: 99,
      },
    },
    {
      id: 'plagiarism-2',
      submissionId: submissions[1]?.id,
      score: 8.2,
      status: 'completed',
      wordCount: 312,
      creditsUsed: 1,
      rawResponse: {
        status: 200,
        result: {
          score: 8.2,
          sourceCounts: 1,
          textWordCounts: 312,
          totalPlagiarismWords: 26,
        },
        sources: [
          {
            score: 8.2,
            url: 'https://stackoverflow.com/calculator-implementation',
            title: 'Simple Calculator Implementation',
            canAccess: true,
          },
        ],
        credits_used: 1,
        credits_remaining: 98,
      },
    },
    {
      id: 'plagiarism-3',
      submissionId: submissions[2]?.id,
      score: 22.7,
      status: 'completed',
      wordCount: 418,
      creditsUsed: 1,
      rawResponse: {
        status: 200,
        result: {
          score: 22.7,
          sourceCounts: 3,
          textWordCounts: 418,
          totalPlagiarismWords: 95,
        },
        sources: [
          {
            score: 15.1,
            url: 'https://geeksforgeeks.org/array-operations',
            title: 'Array Operations in Programming',
            canAccess: true,
          },
          {
            score: 4.8,
            url: 'https://leetcode.com/discuss/algorithms',
            title: 'Algorithm Discussion - Arrays',
            canAccess: true,
          },
          {
            score: 2.8,
            url: 'https://wikipedia.org/sorting-algorithms',
            title: 'Sorting Algorithms - Wikipedia',
            canAccess: true,
          },
        ],
        credits_used: 1,
        credits_remaining: 97,
      },
    },
  ];

  // Only create plagiarism checks if we have submissions
  const validChecks = plagiarismChecks.filter((check) => check.submissionId);

  for (const check of validChecks) {
    await prisma.plagiarismCheck.upsert({
      where: { submissionId: check.submissionId },
      update: {},
      create: check,
    });
  }

  console.log(`   ✅ Created/updated ${validChecks.length} plagiarism checks`);
}

/**
 * Seed Submission Versions
 */
async function seedSubmissionVersions() {
  console.log('📝 Seeding submission versions...');

  const submissions = await prisma.submission.findMany({
    take: 3, // Sample untuk 3 submission pertama
  });

  // 🔧 Explicitly type the array
  const versions: VersionData[] = [];

  for (const submission of submissions) {
    // Version 1 (initial)
    versions.push({
      id: `version-${submission.id}-1`,
      submissionId: submission.id,
      version: 1,
      content: submission.content,
      updatedAt: new Date(submission.createdAt.getTime() + 1000), // 1 second later
    });

    // Version 2 (revised)
    versions.push({
      id: `version-${submission.id}-2`,
      submissionId: submission.id,
      version: 2,
      content:
        submission.content +
        '\n\n## Revision 1\nAdded more details and examples.',
      updatedAt: new Date(submission.createdAt.getTime() + 60000), // 1 minute later
    });

    // Version 3 (final)
    if (submission.status === 'SUBMITTED' || submission.status === 'GRADED') {
      versions.push({
        id: `version-${submission.id}-3`,
        submissionId: submission.id,
        version: 3,
        content:
          submission.content +
          '\n\n## Revision 1\nAdded more details and examples.\n\n## Final Review\nCompleted all requirements.',
        updatedAt: new Date(submission.updatedAt.getTime()),
      });
    }
  }

  for (const version of versions) {
    await prisma.submissionVersion.upsert({
      where: {
        submissionId_version: {
          submissionId: version.submissionId,
          version: version.version,
        },
      },
      update: {},
      create: version,
    });
  }

  console.log(`   ✅ Created/updated ${versions.length} submission versions`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
