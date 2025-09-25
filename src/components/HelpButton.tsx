import { Button } from '@/components/ui/button'
import { Info } from 'lucide-react'

export default function LogoutButton() {
  const handleClick = () => {
    window.open('https://audibene-my.sharepoint.com/:w:/g/personal/caden_shokat_hear_com/EewY4OYAR05KmxXyRJc7KDoBc5Ps__V-uFNjXvFud8CgZQ?e=9QPeCg', '_blank')
  }
  
  return (
    <Button variant="ghost" className="rounded-full" onClick={handleClick}>
      <Info />
    </Button>
  )
}