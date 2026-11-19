import type { MemoirDatabase } from '../types/memoir';

export const SCHEMA_VERSION = '1.0.0';

export const INITIAL_MEMOIR_DATA: MemoirDatabase = {
  schemaVersion: SCHEMA_VERSION,
  lastModified: '2026-11-18T00:00:00.000Z',
  home: {
    hero: {
      spaceLabel: 'Không gian hồi ký điện tử · Lưu trữ đa thế hệ',
      title: 'Hồi ký Chi đoàn Cù Chính Lan',
      unitIntro: 'Đoàn trường THPT Hoàng Hoa Thám – Quận Đoàn Bình Thạnh',
      subtitle:
        'Nơi lưu giữ ký ức thanh xuân, tư liệu lịch sử, chân dung các thế hệ đoàn viên và dấu ấn phong trào qua nhiều thập kỷ cống hiến.',
      heroImage: '/src/assets/images/hero_yearbook_banner_1794965031490.jpg',
    },
    history: {
      foundingTitle: 'Quá trình hình thành và phát triển Chi đoàn Cù Chính Lan',
      foundingContent:
        '[Dữ liệu mẫu minh họa] Chi đoàn Cù Chính Lan trực thuộc Đoàn trường THPT Hoàng Hoa Thám – Quận Đoàn Bình Thạnh được hình thành nhằm quy tụ lực lượng đoàn viên ưu tú, phát huy truyền thống học tập, rèn luyện và xung kích tình nguyện. Toàn bộ nội dung lịch sử chi tiết theo từng niên khóa có thể được Ban Quản trị cập nhật trực tiếp hoặc thay thế từ nguồn tư liệu lưu trữ chính thức của Chi đoàn.',
      stages: [
        {
          id: 'stage-1',
          period: 'Giai đoạn khởi đầu (Mẫu minh họa)',
          title: 'Xây dựng nền móng và sinh hoạt truyền thống',
          description:
            'Thiết lập mô hình sinh hoạt Chi đoàn gắn với học tập, văn nghệ và các phong trào thanh niên tại trường THPT Hoàng Hoa Thám.',
        },
        {
          id: 'stage-2',
          period: 'Giai đoạn phát triển (Mẫu minh họa)',
          title: 'Mở rộng phong trào tình nguyện và kết nối Quận Đoàn Bình Thạnh',
          description:
            'Triển khai các chiến dịch tình nguyện mùa hè, hoạt động đền ơn đáp nghĩa và giao lưu giữa các thế hệ cựu đoàn viên.',
        },
        {
          id: 'stage-3',
          period: 'Giai đoạn hiện tại',
          title: 'Số hóa tư liệu và xây dựng Không gian Hồi ký Điện tử',
          description:
            'Lưu trữ bền vững hình ảnh chân dung, bài viết kỷ niệm, danh mục sự kiện và hồ sơ đoàn viên qua các thời kỳ.',
        },
      ],
      achievementsSummary:
        '[Dữ liệu mẫu minh họa] Ghi nhận nhiều năm liền là tập thể Chi đoàn tiêu biểu trong công tác Đoàn và phong trào thanh niên tại Đoàn trường THPT Hoàng Hoa Thám; gắn kết bền chặt mạng lưới cựu đoàn viên, cố vấn và thế hệ trẻ tiếp nối.',
    },
    meaning: {
      introContent:
        'Không gian Hồi ký Điện tử Chi đoàn Cù Chính Lan được thiết kế như một biên niên sử sống động, nơi mọi tư liệu, bức ảnh cũ và câu chuyện trưởng thành đều được trân trọng lưu giữ.',
      traditionalValues:
        'Giữ gìn tinh thần xung kích, nghĩa tình đồng đội, lòng biết ơn thầy cô và niềm tự hào mang tên người anh hùng Cù Chính Lan dưới mái trường Hoàng Hoa Thám.',
      memoirGoals:
        'Số hóa toàn diện hồ sơ đoàn viên qua các thời kỳ, chuẩn hóa tư liệu sự kiện và đảm bảo khả năng sao lưu – phục hồi dữ liệu an toàn qua nhiều năm.',
      generationalConnection:
        'Tạo cầu nối trực tiếp giữa các thế hệ đoàn viên đầu tiên, đội ngũ cố vấn – khách mời danh dự và lực lượng đoàn viên đương nhiệm.',
    },
    anthem: {
      title: 'Hành khúc Chi đoàn Cù Chính Lan (Mẫu trình bày)',
      authorName: 'Tác giả: [Quản trị viên cập nhật tên nhạc sĩ / đoàn viên sáng tác]',
      composerInfo: 'Năm sáng tác & Hoàn cảnh ra đời: [Cập nhật tư liệu thực tế]',
      relatedInfo:
        'Khu vực lưu giữ lời bài hát truyền thống, hoàn cảnh sáng tác, tư liệu ảnh bìa và danh sách các ca khúc do đoàn viên Chi đoàn sáng tác được liên kết qua YouTube.',
      coverImage: '/src/assets/images/anthem_music_archive_1794965030642.jpg',
      youtubeTracks: [],
      sections: [
        {
          id: 'anthem-intro',
          partType: 'Intro',
          label: 'Intro — Khúc dạo đầu',
          lyrics:
            '[Dữ liệu mẫu minh họa bố cục lời bài hát]\nNhịp trống hành quân vang lên dưới hàng phượng vĩ sân trường Hoàng Hoa Thám,\nMàu áo xanh thanh niên gọi tên những mùa xuân rực rỡ.',
        },
        {
          id: 'anthem-verse-1',
          partType: 'Verse',
          label: 'Verse — Lời 1',
          lyrics:
            'Từ những ngày đầu chung tay dựng xây Chi đoàn mang tên người anh hùng,\nTrang vở học trò hòa cùng bước chân tình nguyện khắp phố phường Bình Thạnh.',
        },
        {
          id: 'anthem-chorus',
          partType: 'Chorus',
          label: 'Chorus — Điệp khúc',
          lyrics:
            'Tiến bước lên, Chi đoàn Cù Chính Lan kiên trung và sáng tạo,\nGiữ trọn lời thề tuổi trẻ, viết tiếp trang hồi ký tự hào hôm nay và mai sau.',
        },
        {
          id: 'anthem-bridge',
          partType: 'Bridge',
          label: 'Bridge — Chuyển đoạn',
          lyrics:
            'Dẫu thời gian có phai màu ảnh cũ, tình đồng đội và ký ức mái trường vẫn nguyên vẹn trong tim mỗi người.',
        },
        {
          id: 'anthem-outro',
          partType: 'Outro',
          label: 'Outro — Kết khúc',
          lyrics:
            'Hoàng Hoa Thám vang mãi khúc ca thanh xuân — Chi đoàn Cù Chính Lan vững bước tương lai.',
        },
      ],
    },
    socialChannels: [
      {
        id: 'soc-1',
        platform: 'Facebook',
        label: 'Cổng thông tin Đoàn trường THPT Hoàng Hoa Thám',
        url: 'https://facebook.com',
      },
      {
        id: 'soc-2',
        platform: 'Website',
        label: 'Quận Đoàn Bình Thạnh',
        url: 'https://binhthanh.hochiminhcity.gov.vn',
      },
    ],
    dataOrigin: 'sample',
  },
  milestones: [
    {
      id: 'ms-1',
      year: 'Giai đoạn 01',
      title: 'Thành lập Chi đoàn Cù Chính Lan (Mẫu minh họa)',
      description:
        'Cột mốc khai sinh Chi đoàn tại Đoàn trường THPT Hoàng Hoa Thám. Quản trị viên có thể thay thế năm chính xác và biên bản thành lập.',
      orderIndex: 0,
      dataOrigin: 'sample',
    },
    {
      id: 'ms-2',
      year: 'Giai đoạn 02',
      title: 'Phong trào Thanh niên Xung kích & Tình nguyện (Mẫu minh họa)',
      description:
        'Những mùa chiến dịch Hoa Phượng Đỏ, tiếp sức mùa thi và hoạt động cộng đồng tại quận Bình Thạnh.',
      orderIndex: 1,
      dataOrigin: 'sample',
    },
    {
      id: 'ms-3',
      year: 'Giai đoạn 03',
      title: 'Hội ngộ các thế hệ & Xây dựng Hồi ký Điện tử',
      description:
        'Quy tụ tư liệu ảnh trước và sau của đoàn viên qua nhiều niên khóa để lưu trữ lâu dài trên nền tảng số.',
      orderIndex: 2,
      dataOrigin: 'sample',
    },
  ],
  leaderMessages: [
    {
      id: 'msg-1',
      title: 'Lời ngỏ gửi các thế hệ Đoàn viên Chi đoàn Cù Chính Lan (Mẫu minh họa)',
      authorName: 'Đại diện Ban Giám hiệu & Đoàn trường (Mẫu)',
      authorRole: 'Hiệu trưởng / Lãnh đạo nhà trường',
      period: 'Tư liệu mẫu giao diện',
      content:
        'Mỗi thế hệ học sinh và đoàn viên đi qua mái trường THPT Hoàng Hoa Thám đều để lại một phần thanh xuân tươi đẹp. Không gian Hồi ký Điện tử Chi đoàn Cù Chính Lan là nhịp cầu lưu giữ ký ức, nhắc nhớ truyền thống hiếu học, tinh thần dấn thân và nghĩa tình gắn bó suốt nhiều thập kỷ. Mong rằng các thế hệ sẽ tiếp tục đóng góp tư liệu, hình ảnh và câu chuyện thật để cuốn hồi ký ngày càng trọn vẹn.',
      createdAt: '2026-11-18',
      dataOrigin: 'sample',
    },
  ],
  cohorts: [
    {
      id: 'cohort-sample-1',
      name: 'Niên khóa 1998–2001 (Mẫu)',
      period: '1998 - 2001',
      description:
        'Thế hệ đoàn viên giai đoạn đầu xây dựng nền móng phong trào Chi đoàn Cù Chính Lan tại Trường THPT Hoàng Hoa Thám.',
      linkedEventIds: ['evt-sample-1', 'evt-sample-2'],
      linkedMilestoneIds: ['ms-1', 'ms-2'],
      linkedMessageIds: ['msg-1'],
      orderIndex: 0,
      dataOrigin: 'sample',
    },
    {
      id: 'cohort-sample-2',
      name: 'Niên khóa 2008–2011 (Mẫu)',
      period: '2008 - 2011',
      description:
        'Thế hệ đoàn viên xung kích trong các phong trào tình nguyện, văn nghệ và khởi đầu số hóa tư liệu ảnh kỷ yếu.',
      linkedEventIds: ['evt-sample-2', 'evt-sample-3'],
      linkedMilestoneIds: ['ms-2', 'ms-3'],
      linkedMessageIds: ['msg-1'],
      orderIndex: 1,
      dataOrigin: 'sample',
    },
    {
      id: 'cohort-sample-3',
      name: 'Khách mời & Cố vấn các thời kỳ (Mẫu)',
      period: 'Đồng hành xuyên suốt',
      description:
        'Thầy cô cố vấn, đại diện Quận Đoàn Bình Thạnh và khách mời danh dự đã gắn bó cùng nhiều thế hệ Chi đoàn.',
      linkedEventIds: ['evt-sample-1', 'evt-sample-3'],
      linkedMilestoneIds: ['ms-1', 'ms-3'],
      linkedMessageIds: ['msg-1'],
      orderIndex: 2,
      dataOrigin: 'sample',
    },
  ],
  members: [
    {
      id: 'mem-sample-1',
      group: 'member',
      cohortId: 'cohort-sample-1',
      fullName: 'Đoàn viên Mẫu Thế hệ I (Minh họa)',
      youthPhoto: '/src/assets/images/portrait_youth_archive_1794965032987.jpg',
      presentPhoto: '/src/assets/images/portrait_present_mentor_1794965032601.jpg',
      cohortLabel: 'Niên khóa mẫu · Thời trẻ',
      presentLabel: 'Hiện tại',
      role: 'Nguyên Bí thư Chi đoàn (Mẫu)',
      occupation: 'Giảng viên / Nhà nghiên cứu giáo dục',
      field: 'Giáo dục & Quản lý đào tạo',
      joinDate: '1998-03-26',
      phone: '0900 000 001',
      email: 'doanvien.mau1@hoiky-ccl.local',
      biography:
        '[Hồ sơ mẫu minh họa] Đây là hồ sơ mẫu thể hiện cấu trúc so sánh ảnh thời trẻ và hiện tại, tiểu sử công tác, thành tích cá nhân và bài viết chia sẻ. Quản trị viên có thể chỉnh sửa trực tiếp hoặc xóa toàn bộ hồ sơ mẫu để nhập danh sách đoàn viên thật.',
      selfIntro:
        'Những năm tháng sinh hoạt tại Chi đoàn Cù Chính Lan dưới mái trường Hoàng Hoa Thám đã rèn luyện bản lĩnh tổ chức và tinh thần trách nhiệm với cộng đồng.',
      achievements: [
        'Đoàn viên ưu tú cấp Trường (Mẫu minh họa)',
        'Phụ trách công tác phong trào văn nghệ và báo tường Chi đoàn (Mẫu minh họa)',
      ],
      activityPhotos: [
        {
          id: 'ap-1',
          url: '/src/assets/images/event_volunteer_camp_1794965032413.jpg',
          caption: 'Hoạt động tình nguyện trồng cây và trao tặng sách giáo khoa (Ảnh minh họa)',
          takenAt: '2000-07-15',
        },
      ],
      articles: [
        {
          id: 'art-1',
          title: 'Ký ức buổi sinh hoạt dưới tán phượng sân trường (Bài viết mẫu)',
          content:
            'Bài viết mẫu minh họa nơi đoàn viên chia sẻ những kỷ niệm khó quên trong thời gian học tập tại THPT Hoàng Hoa Thám và sinh hoạt cùng Chi đoàn Cù Chính Lan.',
          publishedAt: '2026-10-12',
        },
      ],
      socials: {
        facebook: 'https://facebook.com',
        website: 'https://example.org',
        zalo: '0900000001',
      },
      favoriteQuote: 'Tuổi trẻ là ngọn lửa thắp sáng những giá trị bền lâu cho cộng đồng.',
      orderIndex: 0,
      dataOrigin: 'sample',
      updatedAt: '2026-11-18T00:00:00.000Z',
    },
    {
      id: 'mem-sample-2',
      group: 'member',
      cohortId: 'cohort-sample-2',
      fullName: 'Đoàn viên Mẫu Thế hệ II (Minh họa)',
      youthPhoto: '/src/assets/images/portrait_youth_archive_1794965032987.jpg',
      presentPhoto: '/src/assets/images/portrait_present_mentor_1794965032601.jpg',
      cohortLabel: 'Niên khóa mẫu · Thời trẻ',
      presentLabel: 'Hiện tại',
      role: 'Ủy viên Ban Chấp hành Chi đoàn (Mẫu)',
      occupation: 'Kỹ sư Công nghệ thông tin',
      field: 'Công nghệ & Chuyển đổi số',
      joinDate: '2008-03-26',
      phone: '0900 000 002',
      email: 'doanvien.mau2@hoiky-ccl.local',
      biography:
        '[Hồ sơ mẫu minh họa] Đại diện cho nhóm đoàn viên phụ trách truyền thông, số hóa tư liệu ảnh và hỗ trợ kết nối mạng lưới cựu học sinh – đoàn viên.',
      selfIntro:
        'Luôn trân trọng từng bức ảnh tập thể và mong muốn góp sức bảo tồn ký ức của Chi đoàn trên không gian số.',
      achievements: [
        'Tổ chức số hóa kỷ yếu ảnh qua các nhiệm kỳ (Mẫu minh họa)',
      ],
      activityPhotos: [
        {
          id: 'ap-2',
          url: '/src/assets/images/event_congress_hall_1794965033238.jpg',
          caption: 'Hội trường Đại hội Chi đoàn nhiệm kỳ (Ảnh minh họa)',
          takenAt: '2009-10-20',
        },
      ],
      articles: [],
      socials: {
        facebook: 'https://facebook.com',
        zalo: '0900000002',
      },
      favoriteQuote: 'Lưu giữ ký ức hôm nay là trao truyền niềm tin cho thế hệ ngày mai.',
      orderIndex: 1,
      dataOrigin: 'sample',
      updatedAt: '2026-11-18T00:00:00.000Z',
    },
    {
      id: 'mem-sample-3',
      group: 'guest_advisor',
      cohortId: 'cohort-sample-3',
      fullName: 'Cố vấn & Khách mời Danh dự (Mẫu minh họa)',
      youthPhoto: '/src/assets/images/portrait_youth_archive_1794965032987.jpg',
      presentPhoto: '/src/assets/images/portrait_present_mentor_1794965032601.jpg',
      cohortLabel: 'Giai đoạn đồng hành',
      presentLabel: 'Hiện tại',
      role: 'Cố vấn truyền thống Chi đoàn (Mẫu)',
      occupation: 'Nhà giáo / Cán bộ Đoàn chuyên trách',
      field: 'Cố vấn & Kết nối thế hệ',
      joinDate: '1992-05-19',
      phone: '0900 000 003',
      email: 'covan.mau@hoiky-ccl.local',
      biography:
        '[Hồ sơ mẫu minh họa] Dành cho nhóm Khách mời, Thầy Cô cố vấn hoặc đại diện Quận Đoàn Bình Thạnh đã đồng hành, dìu dắt Chi đoàn Cù Chính Lan qua nhiều giai đoạn.',
      selfIntro:
        'Đồng hành cùng thế hệ trẻ Hoàng Hoa Thám là niềm hạnh phúc lớn nhất trong sự nghiệp giáo dục và công tác thanh niên.',
      achievements: [
        'Hơn 20 năm đồng hành cố vấn hoạt động phong trào (Mẫu minh họa)',
      ],
      activityPhotos: [],
      articles: [
        {
          id: 'art-2',
          title: 'Đôi điều nhắn nhủ thế hệ đoàn viên trẻ (Bài viết mẫu)',
          content:
            'Hãy giữ tâm trong, trí sáng và tinh thần dấn thân học hỏi trong mọi hoàn cảnh.',
          publishedAt: '2026-11-01',
        },
      ],
      socials: {
        website: 'https://example.org',
        viber: '0900000003',
      },
      favoriteQuote: 'Mỗi thế hệ đi qua đều để lại một viên gạch quý cho ngôi nhà chung.',
      orderIndex: 2,
      dataOrigin: 'sample',
      updatedAt: '2026-11-18T00:00:00.000Z',
    },
  ],
  events: [
    {
      id: 'evt-sample-1',
      title: 'Đại hội Chi đoàn Cù Chính Lan – Phiên mẫu minh họa',
      category: 'Đại hội',
      date: '2026-03-26',
      startTime: '07:30',
      endTime: '11:30',
      location: 'Hội trường Trường THPT Hoàng Hoa Thám, Quận Bình Thạnh',
      intro:
        '[Sự kiện mẫu minh họa] Sự kiện tổng kết công tác Đoàn nhiệm kỳ, thảo luận phương hướng hoạt động và bầu Ban Chấp hành Chi đoàn mới.',
      proceedings:
        'Chương trình diễn ra trang trọng với nghi thức chào cờ, báo cáo tổng kết phong trào học tập – rèn luyện, tham luận của các phân đoàn và giao lưu cựu đoàn viên.',
      results:
        'Thông qua nghị quyết nhiệm kỳ mới với 100% đại biểu tán thành; khen thưởng các tập thể và cá nhân đoàn viên tiêu biểu.',
      summary:
        'Đại hội diễn ra trang nghiêm, thống nhất định hướng hành động nhiệm kỳ mới và vinh danh các gương đoàn viên xuất sắc.',
      coverImage: '/src/assets/images/event_congress_hall_1794965033238.jpg',
      photos: [
        {
          id: 'ep-1',
          url: '/src/assets/images/event_congress_hall_1794965033238.jpg',
          caption: 'Không gian hội trường trước giờ khai mạc (Ảnh minh họa)',
          albumName: 'Toàn cảnh Đại hội',
        },
      ],
      videos: [],
      participantMemberIds: ['mem-sample-1', 'mem-sample-2', 'mem-sample-3'],
      dataOrigin: 'sample',
      updatedAt: '2026-11-18T00:00:00.000Z',
    },
    {
      id: 'evt-sample-2',
      title: 'Chiến dịch Tình nguyện Xanh & Tủ sách Nghĩa tình (Mẫu)',
      category: 'Tình nguyện',
      date: '2026-07-18',
      startTime: '06:30',
      endTime: '16:00',
      location: 'Khuôn viên Trường THPT Hoàng Hoa Thám & Địa bàn Quận Bình Thạnh',
      intro:
        '[Sự kiện mẫu minh họa] Hoạt động tình nguyện mùa hè quy tụ đoàn viên đương nhiệm và cựu đoàn viên cùng trồng cây xanh, phân loại sách trao tặng học sinh.',
      proceedings:
        'Buổi sáng thực hiện trồng cây xanh tại khuôn viên và vệ sinh tuyến đường thanh niên; buổi chiều phân loại hơn 500 đầu sách giáo khoa, sách kỹ năng trao tặng các em nhỏ.',
      results:
        'Hoàn thành trồng mới 30 cây xanh và trao tặng trọn vẹn tủ sách nghĩa tình đến điểm sinh hoạt thiếu nhi.',
      summary:
        'Ngày hội tình nguyện lan tỏa tinh thần xung kích xanh và nghĩa tình sẻ chia giữa các thế hệ đoàn viên Chi đoàn.',
      coverImage: '/src/assets/images/event_volunteer_camp_1794965032413.jpg',
      photos: [
        {
          id: 'ep-2',
          url: '/src/assets/images/event_volunteer_camp_1794965032413.jpg',
          caption: 'Đoàn viên phân loại sách và trồng cây lưu niệm (Ảnh minh họa)',
          albumName: 'Hoạt động Tình nguyện',
        },
      ],
      videos: [],
      participantMemberIds: ['mem-sample-1', 'mem-sample-2'],
      dataOrigin: 'sample',
      updatedAt: '2026-11-18T00:00:00.000Z',
    },
    {
      id: 'evt-sample-3',
      title: 'Đêm Văn nghệ Truyền thống & Gặp mặt Thế hệ (Mẫu)',
      category: 'Kỷ niệm',
      date: '2026-11-20',
      startTime: '18:00',
      endTime: '21:00',
      location: 'Sân trường THPT Hoàng Hoa Thám',
      intro:
        '[Sự kiện mẫu minh họa] Chương trình giao lưu văn nghệ, ôn lại Hành khúc Chi đoàn và tri ân các thầy cô cố vấn nhân dịp kỷ niệm truyền thống.',
      proceedings:
        'Khởi đầu bằng triển lãm ảnh tư liệu "Thời trẻ và Hiện tại", tiếp nối là hợp ca Hành khúc Chi đoàn Cù Chính Lan và phần tọa đàm chia sẻ từ các cựu đoàn viên.',
      results:
        'Kết nối hơn nhiều thế hệ đoàn viên, thu thập thêm nhiều tư liệu ảnh quý cho kho Hồi ký Điện tử.',
      summary:
        'Đêm hội ngộ ấm áp nghĩa tình thầy trò và đồng đội, khơi dậy niềm tự hào truyền thống Chi đoàn Cù Chính Lan.',
      coverImage: '/src/assets/images/anthem_music_archive_1794965030642.jpg',
      photos: [
        {
          id: 'ep-3',
          url: '/src/assets/images/hero_yearbook_banner_1794965031490.jpg',
          caption: 'Sân trường Hoàng Hoa Thám trong ánh nắng chiều (Ảnh minh họa)',
          albumName: 'Triển lãm Kỷ niệm',
        },
      ],
      videos: [],
      participantMemberIds: ['mem-sample-1', 'mem-sample-3'],
      dataOrigin: 'sample',
      updatedAt: '2026-11-18T00:00:00.000Z',
    },
  ],
  settings: {
    themeMode: 'dark',
    showSampleBanner: true,
    autoSaveEnabled: true,
    compactCards: false,
  },
};
