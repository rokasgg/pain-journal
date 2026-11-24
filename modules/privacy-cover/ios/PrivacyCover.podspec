Pod::Spec.new do |s|
  s.name           = 'PrivacyCover'
  s.version        = '1.0.0'
  s.summary        = 'Covers the app with its splash in the iOS app switcher'
  s.description    = 'Shows the launch splash over the app while it is inactive, so the app switcher never shows health data.'
  s.license        = 'MIT'
  s.author         = 'Pain Journal'
  s.homepage       = 'https://example.com'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.swift"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
