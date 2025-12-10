
'use client';

import { useState } from 'react';
import { HelpCircle, X, ChevronRight, AlertCircle, CheckCircle, Lock, DollarSign, Users, LayoutDashboard, Activity } from 'lucide-react';

interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  roles?: string[]; // Optional role filtering
}

export function HelpButton({ userRole }: { userRole?: string }) {
  const [showHelp, setShowHelp] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const sections: HelpSection[] = [
    {
      id: 'login',
      title: 'Giriş Yapma',
      icon: <Lock className="text-teal-600" size={24} />,
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-gray-800">Nasıl Giriş Yapılır?</h3>
          <ul className="list-disc pl-5 space-y-2 text-gray-700">
            <li>Açılan listeden <strong>adınızı</strong> seçin.</li>
            <li>Size verilen <strong>4 haneli PIN</strong> kodunu girin.</li>
            <li><strong>"Giriş Yap"</strong> butonuna tıklayın.</li>
          </ul>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 flex gap-3">
            <AlertCircle className="text-yellow-600 shrink-0" size={20} />
            <p className="text-sm text-yellow-800">
              <strong>PIN'inizi unuttuysanız:</strong> Yöneticinize başvurun, şifrenizi sıfırlayabilir.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'add-patient-banko',
      title: 'Yeni Hasta Ekleme (Banko)',
      roles: ['banko', 'asistan', 'admin'],
      icon: <Users className="text-blue-600" size={24} />,
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-gray-800">Hasta Nasıl Eklenir?</h3>
          <ol className="list-decimal pl-5 space-y-2 text-gray-700">
            <li><strong>"Yeni Hasta Ekle"</strong> butonuna tıklayın.</li>
            <li>Hekim atama seçeneklerinden birini seçin:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Hekim Tercihi Var:</strong> Hasta belirli bir hekim istiyorsa bu seçeneği kullanın.</li>
                <li><strong>Sıradaki Hekim:</strong> Hasta hekim tercihi yoksa otomatik sıralama ile atama yapın.</li>
              </ul>
            </li>
            <li>Hasta bilgilerini doldurun (Ad, Telefon).</li>
            <li>"Kaydet" butonuna tıklayın.</li>
          </ol>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 flex gap-3">
            <CheckCircle className="text-blue-600 shrink-0" size={20} />
            <p className="text-sm text-blue-800">
              <strong>İpucu:</strong> "Sıradaki Hekim" sistemi her gün dengeli dağılım sağlar (Örn: Mustafa → Berk → Ecem sırası ile).
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'add-treatment',
      title: 'Tedavi Ekleme (Hekim)',
      roles: ['doctor', 'admin', 'asistan'],
      icon: <Activity className="text-red-600" size={24} />,
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-gray-800">Tedavi Nasıl Eklenir?</h3>
          <ol className="list-decimal pl-5 space-y-2 text-gray-700">
            <li>Soldan hastayı seçin.</li>
            <li><strong>"Yeni İşlem Ekle"</strong> formunu doldurun.</li>
            <li>Tedavi adı yazarken:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Daha önce eklenmiş tedaviler otomatik önerilecektir.</li>
                <li>Yeni tedavi ise standart fiyatı da girmeniz istenecektir.</li>
              </ul>
            </li>
            <li><strong>İndirimli fiyat:</strong> Standart fiyattan düşük girerseniz otomatik yüzde hesaplanır.</li>
          </ol>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200 flex gap-3">
            <CheckCircle className="text-green-600 shrink-0" size={20} />
            <p className="text-sm text-green-800">
              <strong>Örnek:</strong> Kanal Tedavisi normalde 5000₺, siz 4500₺ girerseniz → sistem <strong>"%10 indirim"</strong> notunu otomatik ekler.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'payment',
      title: 'Ödeme Girişi (Banko)',
      roles: ['banko', 'admin'],
      icon: <DollarSign className="text-green-600" size={24} />,
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-gray-800">Ödeme Nasıl Alınır?</h3>
          <ul className="list-disc pl-5 space-y-2 text-gray-700">
            <li>Hastayı seçin.</li>
            <li><strong>"Ödeme Ekle"</strong> butonuna tıklayın.</li>
            <li>Tutarı girin.</li>
            <li>Durumu seçin (Tam / Kısmi).</li>
            <li>Not ekleyebilirsiniz (isteğe bağlı).</li>
            <li>"Kaydet" butonuna tıklayın.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'dashboard',
      title: 'Dashboard (Admin)',
      roles: ['admin'],
      icon: <LayoutDashboard className="text-indigo-600" size={24} />,
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-gray-800">Dashboard İstatistikleri</h3>
          <p className="text-gray-700">Dashboard sekmesinde günlük ve aylık performans verilerini görebilirsiniz:</p>
          <ul className="list-disc pl-5 space-y-2 text-gray-700">
            <li><strong>Günlük Hekim Dağılımı:</strong> Her hekimin bugün aldığı hasta sayısı (Sıradan / Referanslı olarak ayrılır).</li>
            <li><strong>Aylık Gelir Grafiği:</strong> Son 6 aylık gelir trendi.</li>
            <li><strong>İşlem Dağılımı:</strong> Kliniğinizde en çok yapılan tedaviler.</li>
            <li><strong>Hekim Performansı:</strong> Her hekimin toplam cirosu.</li>
          </ul>
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200 flex gap-3">
            <CheckCircle className="text-indigo-600 shrink-0" size={20} />
            <p className="text-sm text-indigo-800">
              Raporları sağ üstteki butonlardan PDF veya Excel olarak indirebilirsiniz.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'password-change',
      title: 'Şifre Değiştirme',
      icon: <Lock className="text-purple-600" size={24} />,
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-gray-800">Şifre Nasıl Değiştirilir?</h3>
          <ol className="list-decimal pl-5 space-y-2 text-gray-700">
            <li>Sağ üstteki <strong>kilit ikonuna</strong> tıklayın.</li>
            <li>Mevcut PIN'inizi girin (Doğrulama için).</li>
            <li>Yeni PIN'inizi iki kez girin (Eşleşmesi gerekir).</li>
            <li>"Değiştir" butonuna tıklayın.</li>
          </ol>
          <div className="bg-gray-100 p-4 rounded-lg border border-gray-200 flex gap-3">
            <Lock className="text-gray-600 shrink-0" size={20} />
            <p className="text-sm text-gray-800">
              Güvenlik gereği tüm PIN değişiklikleri sistemde loglanır.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'troubleshooting',
      title: 'Sorun Giderme',
      icon: <HelpCircle className="text-orange-600" size={24} />,
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-gray-800">Yaygın Sorunlar ve Çözümleri</h3>

          <div className="space-y-3">
            <details className="group border border-gray-200 rounded-lg open:border-teal-500 transition">
              <summary className="cursor-pointer p-4 font-medium text-gray-800 group-hover:bg-gray-50 flex items-center justify-between">
                Giriş yapamıyorum
                <ChevronRight size={16} className="text-gray-400 group-open:rotate-90 transition" />
              </summary>
              <div className="p-4 pt-0 text-gray-600 border-t border-gray-100 mt-2">
                PIN'inizi doğru girdiğinizden emin olun. Caps Lock açık olabilir mi? Eğer hala giriş yapamıyorsanız yöneticinizle iletişime geçin.
              </div>
            </details>

            <details className="group border border-gray-200 rounded-lg open:border-teal-500 transition">
              <summary className="cursor-pointer p-4 font-medium text-gray-800 group-hover:bg-gray-50 flex items-center justify-between">
                Veriler güncellenmiyor
                <ChevronRight size={16} className="text-gray-400 group-open:rotate-90 transition" />
              </summary>
              <div className="p-4 pt-0 text-gray-600 border-t border-gray-100 mt-2">
                İnternet bağlantınızı kontrol edin. Sağ üstteki "Sayfayı Yenile" butonuna tıklamayı deneyin veya tarayıcınızı yenileyin (F5).
              </div>
            </details>

            <details className="group border border-gray-200 rounded-lg open:border-teal-500 transition">
              <summary className="cursor-pointer p-4 font-medium text-gray-800 group-hover:bg-gray-50 flex items-center justify-between">
                Mobilde ekran bozuk görünüyor
                <ChevronRight size={16} className="text-gray-400 group-open:rotate-90 transition" />
              </summary>
              <div className="p-4 pt-0 text-gray-600 border-t border-gray-100 mt-2">
                Tarayıcıyı tam ekran modunda kullanın. Chrome veya Safari (iOS) en uyumlu tarayıcılardır. Yazı boyutunu çok büyüttüyseniz küçültmeyi deneyin.
              </div>
            </details>
          </div>

          <div className="mt-4 p-4 bg-orange-50 rounded-lg text-orange-800 border border-orange-200 text-sm">
            <strong>Hala sorun mu yaşıyorsunuz?</strong> Ekran görüntüsü alın ve IT destek ekibinize gönderin.
          </div>
        </div>
      )
    }
  ];

  // Filter sections by role if userRole is provided
  const filteredSections = sections.filter(s =>
    !s.roles || !userRole || s.roles.includes(userRole)
  );

  return (
    <>
      {/* Help Button (Fixed) */}
      <button
        onClick={() => setShowHelp(true)}
        className="fixed bottom-6 right-6 bg-teal-600 text-white p-3 rounded-full shadow-lg hover:bg-teal-700 hover:scale-105 transition-all z-50 group flex items-center gap-2 pr-5"
        title="Yardım"
      >
        <HelpCircle size={28} />
        <span className="font-semibold hidden group-hover:block transition-all">Yardım</span>
      </button>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">

            {/* Header */}
            <div className="p-5 border-b bg-teal-600 text-white flex justify-between items-start shrink-0">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <HelpCircle size={24} />
                  Yardım Merkezi
                </h2>
                <p className="text-teal-100 text-sm mt-1">Size nasıl yardımcı olabiliriz?</p>
              </div>
              <button
                onClick={() => {
                  setShowHelp(false);
                  setActiveSection(null);
                }}
                className="p-2 hover:bg-white/20 rounded-full transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
              {!activeSection ? (
                /* Main Menu */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredSections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-teal-500 hover:bg-teal-50 hover:shadow-md transition-all text-left group"
                    >
                      <div className="p-3 bg-gray-100 rounded-full group-hover:bg-white transition-colors">
                        {section.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800">{section.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">Detaylar için tıklayın</p>
                      </div>
                      <ChevronRight className="text-gray-300 group-hover:text-teal-500" />
                    </button>
                  ))}
                </div>
              ) : (
                /* Detail View */
                <div className="bg-white rounded-xl shadow-sm border p-6 min-h-full">
                  <button
                    onClick={() => setActiveSection(null)}
                    className="mb-6 text-teal-600 hover:text-teal-700 flex items-center gap-2 text-sm font-medium hover:underline"
                  >
                    <ChevronRight className="rotate-180" size={16} />
                    Yardım Menüsüne Dön
                  </button>

                  {filteredSections.find(s => s.id === activeSection)?.content}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 text-center text-xs text-gray-500 shrink-0">
              Teknik destek için: IT Departmanı ile iletişime geçiniz.
            </div>

          </div>
        </div>
      )}
    </>
  );
}
