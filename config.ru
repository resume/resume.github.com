use Rack::Static, :urls => ["/css", "/images", "/js", "/views"], :root => "."
run lambda { |env| [200, { 'Content-Type' => 'text/html' }, File.open('index.html', File::RDONLY)] }
