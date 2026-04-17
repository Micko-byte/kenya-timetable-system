// Database Test Script for Kenya School Timetable Creator
// This script tests: signup, role creation, streams, teachers, and all database operations

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://swreelsxcldxubqshnew.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3cmVlbHN4Y2xkeHVicXNobmV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjE1MTgxMywiZXhwIjoyMDkxNzI3ODEzfQ.e3hfHfUkuPEpRTzFCJtqFOtauu73o3f-zZgV2ri1dUA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runTests() {
  console.log('=== Starting Database Tests ===\n');

  try {
    // Test 1: Create a test school
    console.log('1. Creating test school...');
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .upsert({
        name: 'Test Secondary School',
        type: 'Secondary',
        location: 'Nairobi, Kenya'
      })
      .select()
      .single();

    if (schoolError) throw schoolError;
    console.log('   School created:', school.name, '(ID:', school.id, ')');

    // Test 2: Create test users with different roles
    console.log('\n2. Creating test users...');
    
    const testUsers = [
      { email: 'admin@test.com', role: 'admin', full_name: 'Admin User' },
      { email: 'teacher@test.com', role: 'teacher', full_name: 'Teacher User' },
      { email: 'staff@test.com', role: 'staff', full_name: 'Staff User' }
    ];

    const createdUsers = [];
    
    for (const user of testUsers) {
      // Create auth user (this would normally be done via Supabase Auth)
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: 'testpassword123',
        email_confirm: true
      });

      if (authError && !authError.message.includes('already registered')) {
        console.log('   Auth user creation error:', authError.message);
        continue;
      }

      const userId = authError ? null : authUser.user.id;
      
      if (userId) {
        // Create profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            school_id: school.id,
            email: user.email,
            full_name: user.full_name
          })
          .select()
          .single();

        if (profileError) throw profileError;

        // Create role
        const { data: role, error: roleError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: userId,
            school_id: school.id,
            role: user.role
          })
          .select()
          .single();

        if (roleError) throw roleError;

        createdUsers.push({ ...user, id: userId, profile, role });
        console.log(`   ${user.role} created:`, user.email);
      }
    }

    // Test 3: Create subjects
    console.log('\n3. Creating test subjects...');
    const subjects = [
      { name: 'Mathematics', code: 'MAT', color: '#FF6B6B' },
      { name: 'English', code: 'ENG', color: '#4ECDC4' },
      { name: 'Kiswahili', code: 'KIS', color: '#45B7D1' },
      { name: 'Chemistry', code: 'CHE', color: '#96CEB4' },
      { name: 'Physics', code: 'PHY', color: '#FFEAA7' },
      { name: 'Biology', code: 'BIO', color: '#DDA0DD' }
    ];

    const createdSubjects = [];
    for (const subject of subjects) {
      const { data: createdSubject, error: subjectError } = await supabase
        .from('subjects')
        .upsert({
          school_id: school.id,
          ...subject
        })
        .select()
        .single();

      if (subjectError) throw subjectError;
      createdSubjects.push(createdSubject);
      console.log('   Subject created:', subject.name);
    }

    // Test 4: Create streams (classes)
    console.log('\n4. Creating test streams...');
    const streams = [
      { grade: 9, stream_name: 'North' },
      { grade: 9, stream_name: 'South' },
      { grade: 10, stream_name: 'East' },
      { grade: 10, stream_name: 'West' },
      { grade: 11, stream_name: 'Central' }
    ];

    const createdStreams = [];
    for (const stream of streams) {
      const { data: createdStream, error: streamError } = await supabase
        .from('streams')
        .upsert({
          school_id: school.id,
          ...stream
        })
        .select()
        .single();

      if (streamError) throw streamError;
      createdStreams.push(createdStream);
      console.log(`   Stream created: Grade ${stream.grade} ${stream.stream_name}`);
    }

    // Test 5: Create teachers
    console.log('\n5. Creating test teachers...');
    const teachers = [
      { name: 'John Smith', email: 'john.smith@school.com', max_lessons_per_week: 30 },
      { name: 'Mary Johnson', email: 'mary.johnson@school.com', max_lessons_per_week: 28 },
      { name: 'David Kimani', email: 'david.kimani@school.com', max_lessons_per_week: 25 },
      { name: 'Grace Wanjiru', email: 'grace.wanjiru@school.com', max_lessons_per_week: 32 }
    ];

    const createdTeachers = [];
    for (const teacher of teachers) {
      const { data: createdTeacher, error: teacherError } = await supabase
        .from('teachers')
        .upsert({
          school_id: school.id,
          ...teacher,
          availability: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true },
          workload: 0
        })
        .select()
        .single();

      if (teacherError) throw teacherError;
      createdTeachers.push(createdTeacher);
      console.log('   Teacher created:', teacher.name);
    }

    // Test 6: Assign subjects to teachers
    console.log('\n6. Assigning subjects to teachers...');
    const teacherSubjects = [
      { teacher_id: createdTeachers[0].id, subject_id: createdSubjects[0].id }, // Math
      { teacher_id: createdTeachers[0].id, subject_id: createdSubjects[4].id }, // Physics
      { teacher_id: createdTeachers[1].id, subject_id: createdSubjects[1].id }, // English
      { teacher_id: createdTeachers[1].id, subject_id: createdSubjects[2].id }, // Kiswahili
      { teacher_id: createdTeachers[2].id, subject_id: createdSubjects[3].id }, // Chemistry
      { teacher_id: createdTeachers[2].id, subject_id: createdSubjects[5].id }, // Biology
    ];

    for (const ts of teacherSubjects) {
      const { data: assignment, error: assignmentError } = await supabase
        .from('teacher_subjects')
        .upsert(ts)
        .select()
        .single();

      if (assignmentError) throw assignmentError;
      console.log('   Subject assigned to teacher');
    }

    // Test 7: Assign teachers to classes
    console.log('\n7. Assigning teachers to classes...');
    const teacherAssignments = [
      { teacher_id: createdTeachers[0].id, stream_id: createdStreams[0].id }, // Math to Grade 9 North
      { teacher_id: createdTeachers[1].id, stream_id: createdStreams[0].id }, // English to Grade 9 North
      { teacher_id: createdTeachers[2].id, stream_id: createdStreams[2].id }, // Chemistry to Grade 10 East
      { teacher_id: createdTeachers[3].id, stream_id: createdStreams[4].id }, // Biology to Grade 11 Central
    ];

    for (const assignment of teacherAssignments) {
      const { data: classAssignment, error: classError } = await supabase
        .from('teacher_assigned_classes')
        .upsert(assignment)
        .select()
        .single();

      if (classError) throw classError;
      console.log('   Teacher assigned to class');
    }

    // Test 8: Create subscription
    console.log('\n8. Creating subscription...');
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .upsert({
        school_id: school.id,
        plan_type: 'premium',
        status: 'active',
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
      })
      .select()
      .single();

    if (subscriptionError) throw subscriptionError;
    console.log('   Subscription created:', subscription.plan_type);

    // Test 9: Verify data with queries
    console.log('\n9. Verifying data...');
    
    const { data: allSchools, error: schoolsError } = await supabase
      .from('schools')
      .select('*');
    console.log('   Schools count:', allSchools?.length || 0);

    const { data: allStreams, error: streamsError } = await supabase
      .from('streams')
      .select('*');
    console.log('   Streams count:', allStreams?.length || 0);

    const { data: allTeachers, error: teachersError } = await supabase
      .from('teachers')
      .select('*');
    console.log('   Teachers count:', allTeachers?.length || 0);

    const { data: allSubjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('*');
    console.log('   Subjects count:', allSubjects?.length || 0);

    console.log('\n=== All Tests Completed Successfully! ===');
    console.log('\nTest Login Credentials:');
    console.log('Email: admin@test.com | Password: testpassword123 (Admin)');
    console.log('Email: teacher@test.com | Password: testpassword123 (Teacher)');
    console.log('Email: staff@test.com | Password: testpassword123 (Staff)');

  } catch (error) {
    console.error('Test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the tests
runTests();
