export default function FontPage() {
  return (
    <div>
      <h2 className="text-xl mb-4">Pixel</h2>

      <div className="flex gap-4">
        <div>
          <h3 className="text-lg my-2">subpixel-antialiased</h3>
          <div className="whitespace-pre font-pixel text-12px subpixel-antialiased">
            天地玄黃　宇宙洪荒<br />
            日月盈昃　辰宿列張<br />
            寒來暑往　秋收冬藏<br />
            God is in his heaven, all&apos;s right with the world
          </div>
        </div>

        <div>
          <h3 className="text-lg my-2">antialiased</h3>
          <div className="whitespace-pre font-pixel text-12px antialiased">
            天地玄黃　宇宙洪荒<br />
            日月盈昃　辰宿列張<br />
            寒來暑往　秋收冬藏<br />
            God is in his heaven, all&apos;s right with the world
          </div>
        </div>
      </div>
    </div>
  );
}
