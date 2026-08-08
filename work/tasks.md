# Nashm Work — Backlog التنفيذ

> هذا الملف هو قائمة التذاكر التنفيذية لميزة **Nashm Work**. لا يبدأ المبرمج بتذكرة قبل إنجاز كل ما في `يعتمد على`. كل تذكرة مستقلة وقابلة للتسليم والمراجعة.

## مصطلحات مشتركة

- **مكان التنفيذ**: أجزاء Nashm التي يجب تعديلها. كل Backend جديد يكون TypeScript في `packages/api`; يضاف في `api` فقط route wrapper صغير عند الحاجة.
- **يتكامل مع**: تطبيقات المستخدم أو خدمات خارجية يراها أو يستفيد منها من داخل Nashm. لا نُخرج المستخدم من Work إلا في OAuth consent.
- **يعتمد على**: تذاكر سابقة أو متطلبات خارجية لا يصح تجاهلها.
- **قاعدة أمان**: لا عملية تكتب بيانات خارج Nashm (إرسال بريد، تحديث CRM، إنشاء Issue، تشغيل Automation) دون Preview ثم موافقة صريحة.
- **قاعدة التراخيص**: ERPNext وPlane وEspoCRM وOpenProject أمثلة GPL/AGPL. نستعمل API/MCP أو connector منفصلًا؛ لا ننسخ كودها إلى Nashm قبل مراجعة ترخيص قانونية.

## ترتيب التنفيذ

`W-001 → W-002 → W-003 → W-004/W-005 → W-006 → W-007 → W-008 → W-009 → W-010 → W-011 → W-012 → Connectors/Role kits → Billing → QA/Release`

## قواعد هندسية إلزامية لكل التذاكر

- كل النصوص الظاهرة للمستخدم تمر من `useLocalize()` ومفاتيح إنجليزية فقط في `client/src/locales/en/translation.json`.
- لا `any` ولا types مكررة. تشارك أنواع الـAPI من `packages/data-provider`.
- كل API لها Zod validation، tenant/user authorization، وReact Query query/mutation مناسبين.
- اكتب الاختبارات بجانب الميزة: loading/success/error في الواجهة، وMongo memory server لمسارات البيانات الحقيقية.
- لا تبنِ شاشة مخصصة لكل مهنة. كل المهن تستخدم نفس `RoleKit` وWorkspace components مع بيانات وإعدادات مختلفة.

---

## W-001 — قرار المنتج والـfeature flags

**الهدف:** تعريف Work كطبقة داخل Nashm، وليس تطبيقًا مستقلًا أو تبويبًا يقطع سياق المحادثة.

**تعليمات للمبرمج:**

1. أضف Feature Flag باسم `workMode` في config الحالي، ويكون معطلاً افتراضيًا في production حتى اكتمال الاختبار.
2. اكتب وثيقة قصيرة داخل `work/` تصف الحالات: `chat`, `work-onboarding`, `work-home`, `work-project`.
3. لا تغير سلوك Chat أو المحادثات الحالية عندما يكون العلم معطلاً.
4. عرّف قائمة capabilities مشتركة: `research`, `files`, `artifacts`, `tasks`, `sources`, `connectors`, `automations`, `external_write`.

**مكان التنفيذ:** `packages/data-provider`, `packages/api`, `client`.

**يتكامل مع:** لا شيء خارجي.

**يعتمد على:** لا شيء.

**معيار القبول:** تشغيل `workMode=false` يعرض Nashm الحالي بلا اختلاف؛ تشغيله للمستخدم التجريبي فقط يفتح مسارات Work.

---

## W-002 — كتالوج الوظائف وRoleKit قابل للتهيئة

**الهدف:** إنشاء مصدر واحد للوظائف وقوالبها، حتى نضيف مهنة جديدة بدون نسخ React components أو if/else متشعب.

**تعليمات للمبرمج:**

1. أنشئ `work/roles.ts` في data-provider ويحتوي `RoleId`, `RoleDefinition`, `RoleKit`, `StarterTemplate`, `ToolPolicy` بأنواع صريحة.
2. أضف الوظائف: `business_owner`, `software_engineering`, `finance`, `product`, `marketing`, `consulting`, `operations`, `sales`, `engineering`, `healthcare`, `legal`, `student`, `educator`, `design`, `data_analyst`, `human_resources`, `researcher`, `content_creator`, `real_estate`, `nonprofit`, `other`.
3. لكل RoleKit: الاسم والأيقونة ومجموعة templates والأسئلة الأولية وcapabilities المسموحة والتحذيرات والمقترحات الأولى، لا prompt نصي فقط.
4. اجعل `other` يستقبل مسمى وظيفيًا حرًا ثم يختار أقرب Kit مبدئيًا؛ لا يزعم التخصص عندما تكون الثقة منخفضة.
5. أضف اختبارات تؤكد أن كل `RoleId` يملك title وstarter templates وpolicy صالحة.

**مكان التنفيذ:** `packages/data-provider/src/types`, `packages/data-provider/src/work`, `client/src/constants`.

**يتكامل مع:** Lucide icons الموجودة في المشروع فقط؛ لا تعتمد على خدمة خارجية.

**يعتمد على:** W-001.

**معيار القبول:** يمكن للواجهة رسم جميع الوظائف من catalog واحد، وإضافة RoleKit جديد لا تتطلب تعديل صفحات Work.

---

## W-003 — نماذج بيانات Work وصلاحياتها

**الهدف:** حفظ profile، مساحة العمل، المشاريع، عناصر العمل، المخرجات، المصادر، والموافقات بعزل تام لكل مستخدم/tenant.

**تعليمات للمبرمج:**

1. أضف schemas وtypes في `packages/data-schemas/src/schema/work.ts` و`types/work.ts`، وفق أسلوب المشروع الحالي.
2. النماذج المطلوبة: `WorkProfile`, `Workspace`, `WorkProject`, `WorkItem`, `Artifact`, `Source`, `Approval`, `Connection`.
3. أضف `tenantId`, `owner`, timestamps وفهارس مناسبة للاستعلامات: workspace by owner، project by workspace، items by project/status، approvals pending by owner.
4. لا تخزن access token خامًا في Connection؛ احفظ مرجعًا مشفرًا أو secret identifier فقط.
5. عرّف صلاحيات workspace: `owner`, `editor`, `viewer`، ولا تجعل role الوظيفي صلاحية.
6. اكتب migration/backfill آمناً؛ الحسابات الحالية تبدأ بلا WorkProfile ولا يجب أن تفشل عند فتح Chat.

**مكان التنفيذ:** `packages/data-schemas`, ثم exports اللازمة في `packages/data-provider`.

**يتكامل مع:** MongoDB الحالي وauth/tenant الحاليين.

**يعتمد على:** W-001، W-002.

**معيار القبول:** لا يستطيع مستخدم قراءة أو تعديل Workspace/Artifact لمستخدم أو tenant آخر، وتنجح اختبارات Mongo حقيقية لكل CRUD وصلاحية.

---

## W-004 — API لملف العمل والتفضيلات

**الهدف:** توفير API موحد لحفظ دور المستخدم وتفضيلاته وحالة onboarding.

**تعليمات للمبرمج:**

1. أضف service/routes TypeScript تحت `packages/api/src/work/` لمسارات: get profile، create/update profile، complete onboarding، change primary role.
2. استخدم Zod لنوع المدخلات: role، secondary roles، job title الحر، language، industry، team size، primary goal.
3. لا تقبل أي RoleId غير المسجل في W-002، ولا تسمح بتعديل owner/tenant من body.
4. أضف data-service endpoints وquery/mutation keys وReact Query hooks، ثم invalidation لما يخص profile فقط.
5. عند إكمال onboarding أنشئ profile فقط؛ إنشاء Workspace الافتراضي مسؤولية W-005 حتى تبقى المعاملات واضحة.

**مكان التنفيذ:** `packages/api/src/work`, `api` wrapper عند الحاجة، `packages/data-provider`, `client/src/data-provider/Work`.

**يتكامل مع:** auth/user الحالي.

**يعتمد على:** W-002، W-003.

**معيار القبول:** endpoint يعيد 401/403 بشكل صحيح، والتحويل من onboarding إلى completed idempotent ولا ينشئ Profiles مكررة.

---

## W-005 — API لمساحات العمل والمشاريع وعناصر العمل

**الهدف:** بناء قلب Work القابل للاستخدام من كل المهن.

**تعليمات للمبرمج:**

1. أضف CRUD موثقًا لـWorkspace وProject وWorkItem وArtifact، مع cursor pagination لعناصر العمل والمخرجات.
2. حالات WorkItem: `draft`, `planned`, `in_progress`, `waiting_approval`, `blocked`, `done`, `cancelled`.
3. أنشئ Workspace افتراضيًا بعد أول `complete onboarding` إن لم يوجد، باسم مناسب للدور واللغة.
4. كل Artifact يملك نوعًا صريحًا مثل `report`, `brief`, `plan`, `proposal`, `code_change`, `lesson`, `checklist`, `study_set`، وليس HTML مجهولًا فقط.
5. أضف event/audit بسيط عند إنشاء/تعديل/حذف WorkItem وArtifact.
6. لا تحذف Artifact بشكل نهائي من أول نسخة؛ استعمل soft delete أو revision عند الإمكان.

**مكان التنفيذ:** `packages/api/src/work`, `packages/data-provider`, `packages/data-schemas`.

**يتكامل مع:** MongoDB، المحادثات والملفات الحالية من خلال references فقط في البداية.

**يعتمد على:** W-003، W-004.

**معيار القبول:** المستخدم ينشئ مشروعًا ومهمة ومخرجًا، يغير حالتها، ويرى القائمة paginated مع عدم ظهور المحذوف افتراضيًا.

---

## W-006 — Onboarding لأول دخول

**الهدف:** تحويل المستخدم الجديد من تسجيل الدخول إلى أول قيمة في Work خلال دقائق.

**تعليمات للمبرمج:**

1. أنشئ modal/full-screen flow قابل للاستئناف: Welcome → Role → Context → Kit preview → Plans → Work home.
2. شاشة Role تعرض الصفوف الأساسية كما في مرجع المستخدم، مع قسم "مزيد من المجالات"؛ primary role واحد وsecondary اختياري.
3. شاشة Context تحتوي أربعة أسئلة فقط: الهدف، العمل منفردًا/ضمن فريق، التطبيقات، اللغة/القطاع. كل حقل قابل للتخطي.
4. Kit preview يعرض ثلاث قوالب وثلاث مهام مقترحة حقيقية من RoleKit، وليس نصًا تسويقيًا عامًا.
5. صفحة الخطط تعرض `ابدأ مجانًا` بوضوح ولا تمنع الوصول إلى Workspace.
6. اعمل responsive وRTL حقيقي، مع focus trap وEsc وإمكانية العودة بين الخطوات.
7. لا تستخدم شرط تحديد اللغة الحالي غير الموثوق في UpgradeModal؛ استخدم locale state الفعلي وtranslation keys.

**مكان التنفيذ:** `client/src/components/Work/Onboarding`, `client/src/routes`, hooks من W-004/W-005.

**يتكامل مع:** auth، plans API الحالية، role catalog.

**يعتمد على:** W-002، W-004، W-005.

**معيار القبول:** حساب جديد يختار دورًا، يتخطى الأسئلة، يضغط "ابدأ مجانًا"، ويصل لمساحة بها مشروع/3 مهام starter قابلة للاستعمال.

---

## W-007 — محوّل Chat / Work ومسارات Work

**الهدف:** جعل Work جزءًا طبيعيًا من Nashm بلا إعادة تحميل أو فقدان المحادثة.

**تعليمات للمبرمج:**

1. أضف محوّل `Chat | Work` في الموضع المتفق عليه، مع ARIA labels وحفظ آخر mode محليًا لكل مستخدم.
2. أضف routes: `/work`, `/work/:workspaceId`, `/work/:workspaceId/projects/:projectId` مع auth guard.
3. Chat يبقى المحادثة العادية. Work يظهر Composer مرتبطًا بـWorkspace/Project ويحمل هذا السياق للAgent.
4. لا تنسخ Chat composer: استخرج props/context adapter صغيرًا يسمح بإرسال `workspaceId`, `projectId`, `roleId`.
5. عند feature flag off، لا تظهر routes أو المحوّل للمستخدم العادي.

**مكان التنفيذ:** `client/src/routes`, `client/src/components/Work`, مكونات Chat المشتركة فقط.

**يتكامل مع:** Chat الحالي، conversation API، W-005.

**يعتمد على:** W-001، W-005، W-006.

**معيار القبول:** الانتقال من Chat إلى Work والعودة لا يضيع draft أو conversation، وURL مباشر لمساحة غير مصرح بها يعيد 403/404 آمنًا.

---

## W-008 — واجهة Work Home وProject Home

**الهدف:** إعطاء المستخدم لوحة عمل مفيدة، لا صفحة محادثة فارغة.

**تعليمات للمبرمج:**

1. ابنِ Work Home بأقسام: `اليوم`, `المشاريع`, `المهام`, `المخرجات`, `المصادر`, `الأتمتة`.
2. قسم "اليوم" يعرض العناصر المتأخرة، waiting approval، والمقترح التالي من RoleKit؛ لا يتجاوز 5 بطاقات رئيسية.
3. Project Home يعرض brief قابل للتعديل، progress حسب حالات WorkItem، recent artifacts، ومصادره المرتبطة.
4. أضف empty states تعتمد على RoleKit وزرًا ينشئ أول template مباشرة.
5. اجعل كل بطاقة مرتبطة ببيانات API؛ لا تضف بيانات تجريبية في production.

**مكان التنفيذ:** `client/src/components/Work`, `client/src/data-provider/Work`.

**يتكامل مع:** Workspace/Project/Item/Artifact API.

**يعتمد على:** W-005، W-007.

**معيار القبول:** لكل RoleKit تظهر اقتراحات مختلفة، وتحديث حالة مهمة ينعكس فورًا في Today وProject.

---

## W-009 — محرك القوالب والمخرجات المنظمة

**الهدف:** تحويل طلب المستخدم إلى مخرج عملي منظم، لا مجرد رسالة يمكن أن تضيع في المحادثة.

**تعليمات للمبرمج:**

1. عرّف template input schemas وartifact output schemas في RoleKit؛ مثال: campaign brief، PRD، study plan، proposal.
2. عند اختيار template، افتح نموذج إدخال مختصر ثم أنشئ WorkItem وArtifact draft مرتبطين بالمشروع.
3. مرر للAgent: template schema، role policy، workspace summary، الملفات والمصادر المسموح بها فقط.
4. خزّن الناتج كـstructured content قابل للتصدير لاحقًا، مع revision وsource references.
5. أضف إجراءات: `حفظ`, `تحويل لمهمة`, `طلب تحسين`, `تصدير`, `مشاركة`؛ لا تنفذ إرسالًا خارجيًا هنا.

**مكان التنفيذ:** `packages/data-provider/src/work`, `packages/api/src/work`, `client/src/components/Work`، integration مع `@nashm/agents`.

**يتكامل مع:** Agents الحالي، conversation، files.

**يعتمد على:** W-002، W-005، W-008.

**معيار القبول:** اختيار أي starter template ينشئ Artifact قابلًا للحفظ والتحرير، ويحتفظ بنسخته ومصادره بعد إعادة فتح المشروع.

---

## W-010 — المصادر والمعرفة الخاصة بالـWorkspace

**الهدف:** إسناد كل بحث أو إجابة مهنية لمصادر وملفات المشروع، مع منع خلط معرفة عميل بآخر.

**تعليمات للمبرمج:**

1. أضف Source model من W-003 لروابط الويب وملفات Nashm ونتائج connectors، مع title, URL/reference, retrieved date, trust level, workspaceId.
2. اسمح بإرفاق Source لمخرج أو WorkItem، وعرضه في sidebar مع فتح معاينة آمنة.
3. أضف ingestion queue للملفات الكبيرة؛ لا تجعل request المستخدم ينتظر embedding أو parsing طويلًا.
4. استخدم vector storage مثل Qdrant كخدمة اختيارية خلف abstraction، مع metadata إلزامية `tenantId/workspaceId/sourceId` وفلاتر server-side.
5. أضف زر "استخدم مصادر هذا المشروع فقط" للمهام الحساسة.

**مكان التنفيذ:** `packages/api/src/work`, `packages/data-schemas`, `client/src/components/Work`.

**يتكامل مع:** ملف/بحث Nashm الحالي، Qdrant اختياريًا.

**يعتمد على:** W-003، W-005، W-009.

**معيار القبول:** Artifact يعرض قائمة مصادره؛ بحث Workspace A لا يعيد أي snippet من Workspace B حتى لنفس المستخدم.

---

## W-011 — سياسة الأدوات والموافقات

**الهدف:** جعل كل Agent مفيدًا بدون أن يتصرف باسم المستخدم بلا إذن.

**تعليمات للمبرمج:**

1. أنشئ ToolPolicy resolver يأخذ RoleKit وplan وworkspace permission ويرجع الأدوات المسموحة read/write.
2. العمليات write تخلق Approval فيه: الملخص، التطبيق المستهدف، الفرق المقترح، البيانات المرسلة، التكلفة/credits، تاريخ الانتهاء.
3. في UI أظهر diff أو payload مفهوم قبل زر `موافقة وتنفيذ`، و`رفض` و`تعديل`.
4. لا تمرر access tokens أو secrets إلى model prompt أو Artifact أو audit payload.
5. أضف kill switch لتعطيل external_write عالميًا أو لدور/connector محدد.

**مكان التنفيذ:** `packages/api/src/work`, `packages/data-schemas`, `client/src/components/Work/Approvals`.

**يتكامل مع:** Agents، كل connectors اللاحقة.

**يعتمد على:** W-003، W-005، W-009.

**معيار القبول:** محاولة agent تحديث تطبيق خارجي بدون approval تنتهي بحالة `waiting_approval` ولا يتغير أي شيء خارجي.

---

## W-012 — منصة Connectors مشتركة

**الهدف:** بناء إطار اتصال واحد، بدل تنفيذ OAuth وسجل الأخطاء من الصفر لكل تطبيق.

**تعليمات للمبرمج:**

1. عرّف Connector contract: capabilities, auth type, scopes, read actions, write actions, health check, error normalization.
2. ابدأ بـOAuth credentials encrypted من secret store، وواجهات connect/disconnect/reconnect/status.
3. لا تطلب OAuth scope واسعًا؛ كل connector يعرّف scopes الدنيا المطلوبة ويشرحها للمستخدم.
4. أضف rate-limit/backoff، refresh tokens في backend فقط، وواجهة حالة مفهومة للمستخدم.
5. سجّل app name وscopes ووقت آخر sync فقط، ولا تسجل payload حساسًا في logs.

**مكان التنفيذ:** `packages/api/src/connectors`, `packages/data-schemas`, `packages/data-provider`, `client/src/components/Work/Connections`.

**يتكامل مع:** OAuth provider الخاص بكل تطبيق.

**يعتمد على:** W-003، W-011.

**معيار القبول:** connector وهمي/test connector يمر بدورة connect → status → disconnect، وتفشل إعادة الربط دون كشف secret.

---

## W-013 — Google Drive وملفات العمل

**الهدف:** إتاحة ملفات المستخدم كمعرفة اختيارية ضمن Workspace.

**تعليمات للمبرمج:**

1. ابنِ Google Drive connector read-only أولًا: file picker، metadata، download/import المحدد فقط.
2. لا تفهرس كامل Drive تلقائيًا؛ المستخدم يختار الملفات أو المجلد ويسحب الإذن وقت الحاجة.
3. اعرض مصدر الملف، تاريخ آخر sync، وزر remove الذي يمسح الـindex/reference الخاصة بالـWorkspace.
4. ارفض الملفات غير المدعومة أو كبيرة الحجم برسالة واضحة وطابور معالجة.

**مكان التنفيذ:** Connector platform + `packages/api/src/connectors/drive`, Work sources UI.

**يتكامل مع:** Google Drive، ingestion في W-010.

**يعتمد على:** W-010، W-012.

**معيار القبول:** المستخدم يختار ملفًا واحدًا، يستطيع سؤاله داخل Workspace، ثم يزيله فتختفي نتائجه من البحث.

---

## W-014 — GitHub وPiston للمطورين

**الهدف:** تمكين Software Engineering من فهم الكود وإنشاء تغيير آمن دون جعل Nashm يكتب مباشرة في main.

**تعليمات للمبرمج:**

1. GitHub connector يبدأ read-only: اختيار repo، branches، issues، pull requests، وملفات محددة ضمن scope.
2. أضف code context retrieval يحترم branch/revision ولا يحمّل repository كاملًا إلى prompt بلا حاجة.
3. للتنفيذ، اربط Agent بسandbox منفصل عبر contract واضح مع Piston؛ حدّد CPU/RAM/time/network/file limits واحفظ logs المقيدة.
4. الـwrite path ينشئ patch/branch/PR draft فقط بعد Approval؛ ممنوع merge أو push إلى protected branch.
5. افحص secrets قبل حفظ patch أو إرساله إلى Agent، وأضف تحذيرًا عند repository عام.

**مكان التنفيذ:** `packages/api/src/connectors/github`, agent tool adapter، تطبيق Piston فقط عند وجود endpoint contract متفق عليه.

**يتكامل مع:** GitHub، Piston sandbox، `@nashm/agents`.

**يعتمد على:** W-011، W-012، W-010.

**معيار القبول:** اختيار repo → إنشاء plan → generate patch في sandbox → user approval → PR draft؛ لا يتم push أو merge تلقائيًا.

---

## W-015 — CRM (EspoCRM أولًا)

**الهدف:** جعل Sales وBusiness Owner يتعاملان مع العملاء من Work دون بناء CRM جديد.

**تعليمات للمبرمج:**

1. ابدأ بـEspoCRM API connector: search accounts/contacts/opportunities، قراءة pipeline، وإنشاء draft update.
2. أضف mapping config للمستخدم بين حقول Nashm وحقول CRM بدل hard-code للأسماء.
3. اعرض account brief داخل Work مع data freshness ومصدر كل معلومة.
4. تحديث lead/note/opportunity يحتاج Approval ويعرض payload قبل التنفيذ.
5. صمم contract قابلاً لإضافة HubSpot/Salesforce لاحقًا بدون تعديل RoleKit.

**مكان التنفيذ:** `packages/api/src/connectors/crm`, Work connections/approvals UI.

**يتكامل مع:** EspoCRM أولًا؛ CRM connector platform.

**يعتمد على:** W-011، W-012.

**معيار القبول:** يقرأ المستخدم pipeline، يولد Nashm follow-up draft، ولا يظهر في CRM إلا بعد موافقة المستخدم.

---

## W-016 — الأتمتة الموجّهة

**الهدف:** تحويل أعمال متكررة إلى flows مرئية وقابلة للموافقة، لا إلى Agent غامض يعمل وحده.

**تعليمات للمبرمج:**

1. أضف نموذج Automation: trigger، inputs، steps، schedule، status، last run، approval mode، error.
2. ابدأ بثلاثة flows: digest صباحي، تلخيص ملف جديد، follow-up draft لمهمة متأخرة.
3. استخدم Activepieces عبر API أو trigger/webhook adapter، ولا تعرّض لوحة Activepieces كبديل لواجهة Nashm.
4. ابدأ manual run وpreview؛ schedule/background execution يأتي بعد audit والlimits.
5. كل run يكتب Artifact أو WorkItem ويضيف مصدره ونتيجته، مع retry محدود وتنبيه عند الفشل.

**مكان التنفيذ:** `packages/api/src/automations`, `packages/data-schemas`, `client/src/components/Work/Automations`.

**يتكامل مع:** Activepieces، connectors من W-012، notifications الحالية.

**يعتمد على:** W-005، W-011، W-012.

**معيار القبول:** تشغيل digest يدويًا ينشئ Artifact موثقًا، وفشل خطوة خارجية لا يكرر العملية بلا نهاية ولا يفقد سبب الفشل.

---

## W-017 — RoleKit: صاحب العمل

**الهدف:** إطلاق مساحة عمل تفيد المدير/المؤسس منذ اليوم الأول.

**تعليمات للمبرمج:**

1. أسئلة البداية: اسم النشاط، القطاع، حجم الفريق، الهدف الحالي، مصادر الأرقام.
2. القوالب: `ملخص الإدارة الأسبوعي`, `خطة 30 يوم`, `عرض سعر`, `تحليل منافسين`, `سجل قرارات`.
3. Today cards: cash/sales pending inputs، القرارات المفتوحة، المهام المتأخرة، وbrief اجتماع اليوم.
4. لا تنتج أرقامًا مالية من دون مصدر؛ اعرض assumptions ومراجع كل KPI.

**مكان التنفيذ:** RoleKit config وtemplates فقط، لا شاشة مخصصة.

**يتكامل مع:** ERPNext read-only اختياريًا، EspoCRM، Google Drive، Activepieces.

**يعتمد على:** W-002، W-008، W-009، W-010، W-015، W-016.

**معيار القبول:** يمكن للمؤسس إنشاء تقرير أسبوعي من template، ربط مصادره، وتحويل توصية إلى WorkItem.

---

## W-018 — RoleKit: Software Engineering

**الهدف:** دعم دورة التطوير كاملة من issue إلى PR draft.

**تعليمات للمبرمج:**

1. القوالب: `فهم Issue`, `خطة تنفيذ`, `RFC مختصر`, `خطة اختبار`, `مراجعة PR`.
2. لا تجلب code context إلا من repo/branch الذي اختاره المستخدم.
3. اجعل outputs تحتوي: assumptions، الملفات المتأثرة، الاختبارات المقترحة، المخاطر، patch إن طُلب.
4. لا تستعمل Agent لتنفيذ كود عند غياب sandbox أو approval.

**مكان التنفيذ:** RoleKit config وcomposer adapter؛ التنفيذ الآمن في W-014.

**يتكامل مع:** GitHub، Piston، Agents.

**يعتمد على:** W-009، W-011، W-014.

**معيار القبول:** template "خطة تنفيذ" يربط Issue وrepo، ويعطي مخرجًا منظمًا دون أي كتابة خارجية تلقائية.

---

## W-019 — RoleKit: Finance

**الهدف:** تحليل البيانات المالية وشرحها، دون تنفيذ معاملات أو ادعاء مراجعة محاسبية نهائية.

**تعليمات للمبرمج:**

1. القوالب: `تحليل CSV/Excel`, `توقع تدفق نقدي`, `تفسير فرق الميزانية`, `تقرير إدارة`, `قائمة افتراضات`.
2. اطلب العملة، الفترة، تعريف المقاييس، ومصدر البيانات قبل الحساب.
3. كل مخرج رقمي يوضح الصيغة/الافتراضات، البيانات الناقصة، وتحذير "ليس بديلاً عن محاسب/مدقق".
4. امنع أدوات payments والبنوك وexternal_write لهذا RoleKit في النسخة الأولى.

**مكان التنفيذ:** RoleKit config، schemas خاصة بالـfinancial artifact، file/source adapters.

**يتكامل مع:** Excel/CSV uploads، ERPNext read-only، Metabase/Superset read-only مستقبلًا.

**يعتمد على:** W-009، W-010، W-011.

**معيار القبول:** ملف CSV ينتج تقريرًا يحتوي مصادر الأرقام والافتراضات ولا يزعم بيانات غير موجودة.

---

## W-020 — RoleKit: Product

**الهدف:** تحويل بحث العميل إلى PRD وroadmap ومهام قابلة للتتبع.

**تعليمات للمبرمج:**

1. القوالب: `PRD`, `User story`, `معايير قبول`, `ملخص مقابلات`, `قرار منتج`, `Roadmap`.
2. أضف مخرجات منظمة للأهداف، non-goals، success metrics، risks، open questions.
3. ربط Plane/OpenProject يكون read أولًا؛ إنشاء issue أو cycle يتطلب approval.
4. لا تعامل كل chat message على أنه قرار منتج؛ المستخدم يختار "حفظ كقرار".

**مكان التنفيذ:** RoleKit config وartifact schema وconnector action mapping.

**يتكامل مع:** Plane أو OpenProject، Google Drive، GitHub read-only.

**يعتمد على:** W-009، W-011، W-012.

**معيار القبول:** PRD يمكن تحويل User stories منه إلى WorkItems أو drafts في تطبيق إدارة المشروع بعد موافقة.

---

## W-021 — RoleKit: Marketing

**الهدف:** إنتاج حملات مدروسة ومحتوى متسق مع العلامة وتحليلات يمكن تتبعها.

**تعليمات للمبرمج:**

1. القوالب: `Brand brief`, `ICP`, `خطة حملة`, `تقويم محتوى`, `SEO brief`, `تقرير أداء`.
2. أضف Brand Voice/claims ممنوعة/countries/approval owner إلى profile أو workspace context.
3. المخرج يفرق بين fact/source وبين copy مقترح؛ لا ينشر محتوى مباشرة.
4. عند توفر Matomo/Mautic اجلب النتائج كتاريخ ومصدر، ثم اشرحها ولا تخترع conversion data.

**مكان التنفيذ:** RoleKit config، Artifact types، Sources.

**يتكامل مع:** Mautic، Matomo، Google Drive، Activepieces.

**يعتمد على:** W-009، W-010، W-011، W-016.

**معيار القبول:** ينشئ المستخدم campaign brief وتقويمًا، ويمكنه ربط تقرير الأداء بالمصادر الفعلية.

---

## W-022 — RoleKit: Consulting

**الهدف:** دعم دورة العمل الاستشاري من intake إلى proposal ثم executive report.

**تعليمات للمبرمج:**

1. القوالب: `Client intake`, `Proposal/SOW`, `خطة بحث`, `تحليل سوق`, `تقرير تنفيذي`, `ملخص اجتماع`.
2. افصل بيانات كل عميل في Workspace/Project مستقل ولا تسمح باسترجاع مصادر عميل آخر.
3. أي claim في التقرير البحثي يحتاج مصدرًا أو يحمل وسم "افتراض يحتاج تحقق".
4. أضف جدول deliverables/dates/owners في Proposal schema.

**مكان التنفيذ:** RoleKit config، Source policy، Proposal artifact.

**يتكامل مع:** Google Drive، OpenProject، docassemble اختياريًا.

**يعتمد على:** W-005، W-009، W-010.

**معيار القبول:** proposal يحوي نطاقًا واستثناءات ومواعيد وopen questions، ويحفظ منفصلًا لكل عميل.

---

## W-023 — RoleKit: Operations

**الهدف:** توثيق وتشغيل وتحسين الإجراءات المتكررة.

**تعليمات للمبرمج:**

1. القوالب: `SOP`, `خريطة إجراء`, `سجل مخاطر`, `Incident postmortem`, `SLA review`, `Checklist`.
2. SOP artifact يفرض حقول owner، trigger، inputs، steps، exceptions، SLA، revision date.
3. لا يشغل Automation قبل أن يتغير SOP من draft إلى approved.
4. حوّل كل exception أو incident إلى WorkItem قابل للمتابعة.

**مكان التنفيذ:** RoleKit config وartifact schemas وautomation binding.

**يتكامل مع:** Activepieces، ERPNext، OpenProject، Slack لاحقًا.

**يعتمد على:** W-009، W-011، W-016.

**معيار القبول:** يمكن إنشاء SOP وربطه بـmanual automation preview مع approval واضح.

---

## W-024 — RoleKit: Sales

**الهدف:** مساعدة البائع على فهم العميل وإنجاز follow-up أفضل بدون spam أو تعديل CRM بلا إذن.

**تعليمات للمبرمج:**

1. القوالب: `Account brief`, `خطة اكتشاف`, `رسالة تواصل`, `ملخص مكالمة`, `Follow-up`, `Pipeline review`.
2. Account brief يوضح freshness ومصدر كل حقيقة؛ لا يسمح بتأليف إيراد أو علاقة عميل.
3. رسائل التواصل تبدأ draft فقط مع controls للنبرة واللغة والopt-out.
4. إنشاء note أو update opportunity في CRM يتطلب approval ويحتفظ بالربط مع Artifact.

**مكان التنفيذ:** RoleKit config وCRM actions في Work UI.

**يتكامل مع:** EspoCRM، Google Drive، email connector مستقبلًا.

**يعتمد على:** W-009، W-011، W-015.

**معيار القبول:** يمكن تحويل ملخص مكالمة إلى follow-up draft ثم CRM note بعد موافقة منفصلة.

---

## W-025 — RoleKit: Engineering/Construction

**الهدف:** تنظيم مشاريع الهندسة والموقع بدون تقديم اعتماد هندسي أو سلامة مهنية غير معتمدة.

**تعليمات للمبرمج:**

1. القوالب: `متطلبات ومواصفات`, `Risk register`, `Safety checklist`, `خطة صيانة`, `تقرير موقع`, `BOQ مساعد`.
2. BOQ وsafety outputs يجب أن تحمل مصدر المدخلات و"يتطلب مراجعة مهندس مؤهل" دائمًا.
3. لا تدّع قراءة CAD/BIM أو صحة حسابات إنشائية ما لم تتوفر أداة وخط معالجة معتمدان لاحقًا.
4. اربط المواعيد والمهام مع Gantt/project tool بصورة اختيارية.

**مكان التنفيذ:** RoleKit config وstructured templates فقط في النسخة الأولى.

**يتكامل مع:** OpenProject، ERPNext، Google Drive.

**يعتمد على:** W-009، W-010، W-011.

**معيار القبول:** ينشئ المستخدم risk register أو report قابل للمراجعة، ولا يعطي التطبيق قرار سلامة نهائيًا.

---

## W-026 — RoleKit: Healthcare

**الهدف:** تمكين البحث والسياسات والتوثيق غير السريري من دون خرق خصوصية المرضى أو ممارسة طب.

**تعليمات للمبرمج:**

1. القوالب: `تلخيص بحث`, `Policy checklist`, `مادة تثقيفية`, `Operational handoff`, `مراجعة توثيق`.
2. ضع warning ثابتًا: ليس للتشخيص أو الوصفة أو القرار الطبي، ويجب مراجعة مختص مرخّص.
3. ارفض أو نبه بشدة عند إدخال PHI/ePHI في النسخة العامة؛ لا تربط EHR قبل مسار compliance منفصل.
4. Health profile يعطل external_write افتراضيًا ويقيد Sources إلى مصادر مختارة إن طلب المستخدم.

**مكان التنفيذ:** RoleKit policy، safety filter، UI warning.

**يتكامل مع:** Medplum/OpenEMR فقط في مرحلة regulated deployment، Google Drive de-identified فقط.

**يعتمد على:** W-009، W-010، W-011، W-034.

**معيار القبول:** يظهر التحذير قبل أول template، ويحظر النظام حفظ PHI المؤكد في بيئة Work العامة.

---

## W-027 — RoleKit: Legal

**الهدف:** تسريع تنظيم الوثائق والبحث ومقارنة البنود، وليس تقديم رأي قانوني نهائي.

**تعليمات للمبرمج:**

1. القوالب: `Document intake`, `مقارنة بنود`, `Timeline`, `Checklist`, `مسودة أولية`, `تجميع مستند`.
2. المخرجات تضع clause/source/page references، وتفصل risk flags عن نصيحة قانونية.
3. أضف warning: المسودة تحتاج مراجعة محامٍ مؤهل في الولاية القضائية المناسبة.
4. لا تدمج بيانات عملاء قانونيين بين workspaces ولا تنفذ إرسال/توقيع مستندات في النسخة الأولى.

**مكان التنفيذ:** RoleKit config، legal artifact schema، UI warning.

**يتكامل مع:** docassemble اختياريًا، Google Drive read-only.

**يعتمد على:** W-009، W-010، W-011، W-034.

**معيار القبول:** clause comparison يعرض مواضع النص ومصادره ويظهر التحذير عند التصدير والمشاركة.

---

## W-028 — RoleKit: Student & Researcher

**الهدف:** مساعدة التعلم والبحث مع شفافية مصادر وعدم اختلاق مراجع.

**تعليمات للمبرمج:**

1. القوالب: `خطة دراسة`, `شرح مفهوم`, `Flashcards`, `Quiz`, `خطة ورقة بحث`, `Bibliography`.
2. أضف setting لمستوى الدراسة واللغة وأسلوب الاقتباس؛ لا تحفظ مؤسسته أو عمره إلا إن لزم وبموافقة.
3. أي citation يولده النظام يجب أن يأتي من Source مسجل؛ لا يولد DOI أو رابطًا من خياله.
4. اجعل quiz/flashcards Artifacts قابلة لإعادة المحاولة وحفظ التقدم مستقبلًا.

**مكان التنفيذ:** RoleKit config، study artifact schemas، source rendering.

**يتكامل مع:** Moodle read-only مستقبلًا، Zotero، JupyterLab اختياريًا.

**يعتمد على:** W-009، W-010.

**معيار القبول:** خطة بحث تعرض bibliography حقيقية مرتبطة بالمصادر، وquiz يحفظ كArtifact منفصل.

---

## W-029 — RoleKit: Educator

**الهدف:** تجهيز مواد تدريس قابلة للتعديل تراعي مستوى الطالب ولا تقيمه تلقائيًا بلا مراجعة.

**تعليمات للمبرمج:**

1. القوالب: `خطة درس`, `Rubric`, `نشاط`, `أسئلة متدرجة`, `Feedback draft`, `Course outline`.
2. اطلب المستوى، مدة الدرس، نواتج التعلم، اللغة، والقيود العمرية.
3. Feedback على عمل الطالب يكون draft يراجعه المعلم، ولا يمنح علامة نهائية تلقائية.
4. لا تستخدم بيانات الطلاب/درجاتهم في model prompt من دون موافقات وسياسات تعليمية مناسبة.

**مكان التنفيذ:** RoleKit config وeducation artifact schemas.

**يتكامل مع:** Moodle، H5P، Google Drive مستقبلًا.

**يعتمد على:** W-009، W-010، W-034.

**معيار القبول:** يمكن للمدرس تحويل course outline إلى lesson plan وrubric دون التعامل مع بيانات طلاب حقيقية.

---

## W-030 — RoleKits: Design, Data, HR, Content, Real Estate, Nonprofit

**الهدف:** تغطية الوظائف الشائعة تحت "أخرى" بميزات حقيقية بدلاً من صندوق نص فارغ.

**تعليمات للمبرمج:**

1. **Design:** creative brief، UX research synthesis، design critique؛ لا يولد ملفات تصميم قابلة للنشر تلقائيًا.
2. **Data analyst:** تحليل CSV، data dictionary، dashboard brief؛ يوضح transformations والافتراضات.
3. **HR:** job description، interview rubric، onboarding plan؛ يمنع توصية توظيف نهائية أو معالجة بيانات حساسة بلا سياسة.
4. **Content creator:** script، production brief، calendar، repurposing plan؛ يتحقق من الحقوق ولا يدّعي امتلاك المحتوى.
5. **Real estate:** property brief، comparison checklist، lead follow-up draft؛ لا يقدم تقييمًا عقاريًا رسميًا.
6. **Nonprofit:** grant brief، program plan، impact report؛ يميز الحقائق عن الإفادات غير الموثقة.
7. أضف لكل واحد icon، onboarding questions، 3 starter templates، policy، واختبار catalog كما في W-002.

**مكان التنفيذ:** RoleKit catalog/config فقط.

**يتكامل مع:** Drive، Metabase/Jupyter للبيانات، CRM للـHR/real estate فقط بعد W-015.

**يعتمد على:** W-002، W-009، W-010، W-011.

**معيار القبول:** اختيار أي دور من هذه الأدوار يعطي Work Home وقوالب مختلفة فعلًا عن بقية الأدوار.

---

## W-031 — باقات Work وخطة أسعار B2B

**الهدف:** جعل الاشتراك يعكس قيمة Work ولا يكشف التعقيد الداخلي للتوكنز.

**تعليمات للمبرمج:**

1. افصل العرض التسويقي عن enum الداخلي الحالي قبل تغيير أسماء الخطط. جهز migration من `family` إلى `teams` فقط بعد خطة انتقال للمشتركين الحاليين.
2. اعرض: Free، Pro، Teams، Enterprise، وDeveloper Add-on. اجعل القدرة لكل plan policy-driven، لا checks موزعة في الواجهة.
3. بدل "tokens" للمستخدم بـ`Work credits` مع صفحة استخدام تشرح: بحث، تحليل ملف، تنفيذ agent، automation run.
4. استخدم quotas من backend فقط؛ لا تعتمد على قيم hard-coded في `UpgradeModal`.
5. أصلح كل النصوص العربية المشوهة في UpgradeModal عبر مفاتيح localization.

**مكان التنفيذ:** `packages/data-schemas` subscription types، `packages/api/src/subscriptions`, `packages/data-provider`, `client/src/components/Nav/UpgradeModal.tsx`.

**يتكامل مع:** plan config/admin console الحالي، W-011 policy resolver.

**يعتمد على:** W-001، W-011، قرار تجاري نهائي للأسعار.

**معيار القبول:** تغيّر الخطة من server configuration يغيّر البطاقات والقدرات المسموحة دون deploy للواجهة، وتبقى خطط المستخدمين الحاليين صالحة.

---

## W-032 — Checkout وفواتير وwebhooks

**الهدف:** تحويل زر الترقية من تغيير إداري مباشر إلى اشتراك مدفوع موثوق.

**تعليمات للمبرمج:**

1. لا تستخدم `/api/balance/upgrade` كتغيير خطة مباشر في production المدفوع. استبدله بإنشاء checkout session لدى provider مع allow-list للأسعار والخطط.
2. اختر Stripe أو Paddle وفق بلد البيع والضرائب قبل التنفيذ؛ لا تشغّل الاثنين دون abstraction موحد.
3. تحقق من webhooks بتوقيع provider، idempotency key، mapping بين customer/subscription/Nashm tenant، وتاريخ انتهاء.
4. نفذ حالات: paid، trialing، past_due، cancelled، refund، failed checkout. لا تمنح صلاحية من redirect URL فقط.
5. أضف invoice/receipt portal link وإدارة cancel، واشرح تخفيض الخطة عند انتهاء الفترة.

**مكان التنفيذ:** `packages/api/src/subscriptions`, `api` thin route، `client` billing UI.

**يتكامل مع:** Stripe **أو** Paddle فقط بعد قرار العمل، email service للإيصالات.

**يعتمد على:** W-031، مفاتيح sandbox من provider، قرار قانوني/ضريبي.

**معيار القبول:** الدفع الناجح لا يفعّل الخطة إلا بعد webhook موثق، وتكرار webhook لا يضاعف credits أو subscription records.

---

## W-033 — الخصوصية والتدقيق والأمان

**الهدف:** وضع أساس صالح للفرق والقطاعات الحساسة قبل التوسع في Connectors أو Agents.

**تعليمات للمبرمج:**

1. أنشئ AuditEvent immutable قدر الإمكان: actor، action، resource، timestamp، connector، نتيجة approval؛ من دون secrets أو محتوى حساس كامل.
2. أضف retention/deletion policy على مستوى workspace والـtenant، مع تصدير/حذف طلبات المستخدم.
3. نفذ PII/PHI warning/redaction قبل external model أو connector إن كان scope العام لا يسمح بالبيانات الحساسة.
4. راجع prompt-injection: المحتوى القادم من صفحة ويب/ملف/CRM يعامل كبيانات غير موثوقة ولا يغير ToolPolicy.
5. اعمل threat model لـDrive/GitHub/CRM وPiston، واختبارات SSRF، authorization، tenant isolation، secret leakage.

**مكان التنفيذ:** `packages/api`, `packages/data-schemas`, security middleware، Work settings UI.

**يتكامل مع:** كل connectors، agents، storage، logging.

**يعتمد على:** W-003، W-010، W-011، W-012.

**معيار القبول:** اختبار أمني يحاول قراءة cross-tenant source أو دفع token في prompt/log وينتهي بالفشل؛ audit يعرض من فعل ماذا بلا محتوى حساس.

---

## W-034 — القياس والتجارب

**الهدف:** إثبات أن Work يزيد الإنجاز والاحتفاظ، لا مجرد عدد المحادثات.

**تعليمات للمبرمج:**

1. عرّف events: `work_onboarding_started/completed`, `role_selected`, `template_started/completed`, `artifact_saved`, `approval_requested/approved/rejected`, `connector_connected`, `upgrade_started/completed`.
2. لا ترسل prompt/file content إلى analytics؛ استعمل IDs ونوع role/template وحالة نجاح فقط.
3. لوحة داخلية تقيس: time-to-first-artifact، completion rate لكل RoleKit، weekly active workspaces، approval rejection، cost per completed artifact.
4. فعّل A/B test صغير لترتيب Kit preview أو plans بعد وجود consent وإعداد experiment واضح.

**مكان التنفيذ:** analytics service الحالي أو provider مع abstraction، admin console.

**يتكامل مع:** PostHog اختياريًا أو analytics الحالي، subscription/Work events.

**يعتمد على:** W-006، W-008، W-009، W-031.

**معيار القبول:** يستطيع الفريق معرفة أي RoleKit يصل لأول Artifact أسرع، بدون ظهور محتوى المستخدم في analytics.

---

## W-035 — اختبارات، وصولية، وإطلاق تدريجي

**الهدف:** إطلاق Work بثقة وبدون كسر Nashm Chat أو بيانات المشتركين.

**تعليمات للمبرمج:**

1. أضف unit/integration/e2e flows: حساب جديد، حساب قديم، free/pro/team، كل workspace permission، كل approval state، connector failure، disabled flag.
2. اختبر RTL والعربية والإنجليزية؛ راجع أن العربية لا تحتوي mojibake وأن tab order وscreen reader labels سليمة.
3. نفذ load test للمصادر/pagination وagent jobs؛ لا تحمّل كل artifacts/messages في Work Home.
4. أطلق داخليًا أولاً ثم beta لمستخدمين حقيقيين من خمس فئات: business, sales, marketing, product, software.
5. جهز rollback: feature flag off، وقف external writes، تعطيل connector منفرد، ومراقبة أخطاء/تكلفة.

**مكان التنفيذ:** اختبارات كل workspace، e2e، config، admin console.

**يتكامل مع:** جميع أجزاء Nashm وconnectors والـbilling إن فعّل.

**يعتمد على:** W-001 إلى W-034 بحسب النطاق الذي سيُطلق.

**معيار القبول:** اجتياز CI، قائمة manual QA موقعة، وdashboard إطلاق يظهر activation/errors/cost مع rollback جاهز.

---

## تقسيم الإصدار المقترح

### Beta 1

W-001 إلى W-011، مع RoleKits W-017 وW-018 وW-020 وW-021 وW-024، وبدون أي external write.

### Beta 2

W-012 إلى W-016، W-019 وW-022 وW-023 وW-025 وW-028 إلى W-030، مع approvals وconnectors read-only أولًا.

### General Availability

W-031 إلى W-035، مع Stripe/Paddle، Teams، audit/privacy، والإطلاق المتدرج. W-026 وW-027 لا تخرجان من beta إلا بعد المراجعة التنظيمية والقانونية.
