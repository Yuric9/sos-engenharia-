use std::{fs, path::Path};

const W: usize = 64;
const H: usize = 64;

type Pixel = [u8; 4]; // BGRA

fn put(img: &mut [Pixel], x: i32, y: i32, c: Pixel) {
    if x >= 0 && y >= 0 && (x as usize) < W && (y as usize) < H {
        img[y as usize * W + x as usize] = c;
    }
}

fn rect(img: &mut [Pixel], x0: i32, y0: i32, x1: i32, y1: i32, c: Pixel) {
    for y in y0..=y1 { for x in x0..=x1 { put(img, x, y, c); } }
}

fn stripe(img: &mut [Pixel], x0: i32, y0: i32, x1: i32, y1: i32, radius: i32, c: Pixel) {
    let dx = x1 - x0; let dy = y1 - y0; let steps = dx.abs().max(dy.abs()).max(1);
    for i in 0..=steps {
        let x = x0 + dx * i / steps; let y = y0 + dy * i / steps;
        for yy in -radius..=radius { for xx in -radius..=radius { if xx*xx + yy*yy <= radius*radius { put(img, x+xx, y+yy, c); } } }
    }
}

fn star(img: &mut [Pixel], cx: i32, cy: i32, c: Pixel) {
    put(img,cx,cy,c); put(img,cx-1,cy,c); put(img,cx+1,cy,c); put(img,cx,cy-1,c); put(img,cx,cy+1,c);
    put(img,cx-1,cy-1,c); put(img,cx+1,cy-1,c);
}

fn glyph(ch: char) -> [&'static str; 7] {
    match ch {
        'S' => ["11111","10000","10000","11111","00001","00001","11111"],
        'O' => ["01110","10001","10001","10001","10001","10001","01110"],
        _ => ["00000","00000","00000","00000","00000","00000","00000"],
    }
}

fn draw_text(img: &mut [Pixel], text: &str, start_x: i32, start_y: i32, scale: i32, c: Pixel) {
    let mut ox = start_x;
    for ch in text.chars() {
        for (ry,row) in glyph(ch).iter().enumerate() {
            for (rx,b) in row.bytes().enumerate() {
                if b == b'1' { rect(img, ox + rx as i32*scale, start_y + ry as i32*scale, ox + rx as i32*scale + scale-1, start_y + ry as i32*scale + scale-1, c); }
            }
        }
        ox += 6*scale;
    }
}

fn write_windows_icon(path: &Path) -> std::io::Result<()> {
    let navy: Pixel=[45,28,8,255]; let green: Pixel=[45,150,20,255]; let blue: Pixel=[210,91,5,255]; let blue2: Pixel=[238,120,8,255]; let gold: Pixel=[24,174,255,255]; let white: Pixel=[250,250,250,255];
    let mut img=vec![navy; W*H];
    rect(&mut img,7,14,30,27,green); rect(&mut img,34,14,57,27,green);
    rect(&mut img,19,27,31,43,blue); rect(&mut img,33,27,45,43,blue2);
    stripe(&mut img,12,42,56,18,3,gold);
    star(&mut img,32,5,gold); star(&mut img,25,9,gold); star(&mut img,39,9,gold);
    draw_text(&mut img,"SOS",15,48,2,white);

    let and_row=((W+31)/32)*4; let and_size=and_row*H; let image_size=40 + W*H*4 + and_size;
    let mut out=Vec::with_capacity(22+image_size);
    out.extend_from_slice(&[0,0,1,0,1,0]);
    out.push(W as u8); out.push(H as u8); out.push(0); out.push(0);
    out.extend_from_slice(&1u16.to_le_bytes()); out.extend_from_slice(&32u16.to_le_bytes());
    out.extend_from_slice(&(image_size as u32).to_le_bytes()); out.extend_from_slice(&22u32.to_le_bytes());
    out.extend_from_slice(&40u32.to_le_bytes()); out.extend_from_slice(&(W as i32).to_le_bytes()); out.extend_from_slice(&((H*2) as i32).to_le_bytes());
    out.extend_from_slice(&1u16.to_le_bytes()); out.extend_from_slice(&32u16.to_le_bytes()); out.extend_from_slice(&0u32.to_le_bytes());
    out.extend_from_slice(&((W*H*4) as u32).to_le_bytes()); out.extend_from_slice(&0i32.to_le_bytes()); out.extend_from_slice(&0i32.to_le_bytes()); out.extend_from_slice(&0u32.to_le_bytes()); out.extend_from_slice(&0u32.to_le_bytes());
    for y in (0..H).rev() { for x in 0..W { out.extend_from_slice(&img[y*W+x]); } }
    out.resize(out.len()+and_size,0);
    if let Some(parent)=path.parent(){fs::create_dir_all(parent)?;} fs::write(path,out)
}

fn main(){
    let icon=Path::new("icons/icon.ico");
    write_windows_icon(icon).expect("falha ao gerar icone SOS");
    tauri_build::build();
}
